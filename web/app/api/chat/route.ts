import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";
import { maskPii } from "@/lib/mask-pii";
import { embedText } from "@/lib/embeddings";
import { streamDeepSeekChat, summarizePreference, type ChatMessage } from "@/lib/deepseek";

// anyang-backend-api 3절 — 채팅 + RAG. DeepSeek 스트리밍 응답을 tee()해 클라이언트로는 원본
// SSE 바이트를 그대로 전달하고, 다른 분기는 서버가 읽어 조립·저장한다(스트림 형식 자체는
// DeepSeek(OpenAI 호환) SSE 그대로 — 3차/frontend가 그 형식을 그대로 파싱해야 한다).
const RAG_TOP_K = 5;
const PREFERENCE_EXTRACTION_EVERY_N_MESSAGES = 6; // 제안값(미확정) — 메시지 6개(왕복 3회)마다

function internalDeepSeekUserId(userId: string): string {
  // 실제 user_id/email이 아닌, 사용자별로 고정된 무작위 성격의 내부 ID(anyang-backend-api 3절 3번).
  return createHash("sha256").update(`${userId}:${process.env.AUTH_SECRET ?? ""}`).digest("hex").slice(0, 32);
}

export async function buildQueryVector(userId: string, messageEmbedding: number[]): Promise<number[]> {
  const { rows } = await pool.query<{ embedding: string }>(
    `select embedding from user_preferences where user_id = $1 order by updated_at desc limit 5`,
    [userId],
  );
  if (rows.length === 0) return messageEmbedding;

  const prefVectors = rows.map((r) => JSON.parse(r.embedding) as number[]);
  const avgPref = prefVectors[0].map(
    (_, i) => prefVectors.reduce((sum, v) => sum + v[i], 0) / prefVectors.length,
  );
  return messageEmbedding.map((v, i) => 0.5 * v + 0.5 * avgPref[i]);
}

async function maybeExtractPreference(conversationId: string, userId: string): Promise<void> {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*)::text as count from messages where conversation_id = $1`,
    [conversationId],
  );
  const messageCount = Number(rows[0]?.count ?? 0);
  if (messageCount === 0 || messageCount % PREFERENCE_EXTRACTION_EVERY_N_MESSAGES !== 0) return;

  const { rows: historyRows } = await pool.query<{ role: string; content: string }>(
    `select role, content from messages where conversation_id = $1 order by created_at asc`,
    [conversationId],
  );
  const conversationText = historyRows.map((m) => `${m.role}: ${maskPii(m.content)}`).join("\n");

  let summary: string | null;
  try {
    summary = await summarizePreference(conversationText);
  } catch {
    return; // 선호 추출 실패는 채팅 자체를 실패시키지 않는다(부가 기능)
  }
  if (!summary) return;

  const maskedSummary = maskPii(summary);
  try {
    const embedded = await embedText(maskedSummary);
    await pool.query(
      `insert into user_preferences (user_id, preference_text, embedding, embedding_model, source_conversation_id)
       values ($1, $2, $3, $4, $5)`,
      [userId, maskedSummary, JSON.stringify(embedded.embedding), embedded.model, conversationId],
    );
  } catch {
    // 임베딩 실패 시 이 회차의 선호 저장만 건너뛴다.
  }
}

export async function consumeAndStore(
  stream: ReadableStream<Uint8Array>,
  conversationId: string,
  userId: string,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) assistantText += delta;
      } catch {
        // 부분/비-JSON 청크는 무시. 클라이언트에는 별도 tee 분기로 원본이 이미 전달됐다.
      }
    }
  }

  if (assistantText) {
    await pool.query(`insert into messages (conversation_id, role, content) values ($1, 'assistant', $2)`, [
      conversationId,
      assistantText,
    ]);
    await pool.query(`update conversations set updated_at = now() where id = $1`, [conversationId]);
    await maybeExtractPreference(conversationId, userId);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const body = (await request.json().catch(() => null)) as
    | { conversation_id?: unknown; message?: unknown }
    | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  let conversationId = typeof body?.conversation_id === "string" ? body.conversation_id : null;
  if (conversationId) {
    const owned = await pool.query(`select id from conversations where id = $1 and user_id = $2`, [
      conversationId,
      authResult.userId,
    ]);
    if (owned.rows.length === 0) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
  } else {
    const title = message.slice(0, 30); // anyang-backend-api 3-1절 — 첫 메시지 앞부분 자르기
    const { rows } = await pool.query<{ id: string }>(
      `insert into conversations (user_id, title) values ($1, $2) returning id`,
      [authResult.userId, title],
    );
    conversationId = rows[0].id;
  }

  // 저장은 가림 처리 전 원문으로 한다(설계 3절 1번) — DB 자체는 외부 전송 대상이 아니다.
  await pool.query(`insert into messages (conversation_id, role, content) values ($1, 'user', $2)`, [
    conversationId,
    message,
  ]);

  const maskedMessage = maskPii(message);

  let queryVector: number[];
  try {
    const embedded = await embedText(maskedMessage);
    queryVector = await buildQueryVector(authResult.userId, embedded.embedding);
  } catch {
    return NextResponse.json({ error: "EMBEDDING_FAILED" }, { status: 502 });
  }

  const { rows: notices } = await pool.query<{ title: string; chunk_text: string }>(
    `select n.title, nc.chunk_text
       from notice_chunks nc
       join notices n on n.id = nc.notice_id
      where n.hidden_at is null
      order by nc.embedding <=> $1
      limit $2`,
    [JSON.stringify(queryVector), RAG_TOP_K],
  );

  const { rows: profileRows } = await pool.query<{
    birth_year: number | null;
    gender: string | null;
    occupation_type: string | null;
    enrollment_status: string | null;
  }>(
    `select birth_year, gender, occupation_type, enrollment_status from profiles where user_id = $1`,
    [authResult.userId],
  );
  const profile = profileRows[0] ?? null;
  const conditionText = profile
    ? `출생연도: ${profile.birth_year ?? "미상"}, 성별: ${profile.gender ?? "미상"}, ` +
      `직군: ${profile.occupation_type ?? "미상"}, 재학재직: ${profile.enrollment_status ?? "미상"}`
    : "사용자 조건 정보 없음";
  const noticesText = notices.length
    ? notices.map((n, i) => `[${i + 1}] ${n.title}\n${n.chunk_text}`).join("\n\n")
    : "(관련 공지 없음)";

  const systemPrompt =
    "당신은 안양시 청년정책 안내 비서입니다. 아래 사용자 조건에 맞는 공지를 우선 언급하며 " +
    `답하세요.\n\n사용자 조건 - ${conditionText}\n\n관련 공지:\n${noticesText}`;

  const { rows: historyRows } = await pool.query<{ role: string; content: string }>(
    `select role, content from messages where conversation_id = $1 order by created_at asc`,
    [conversationId],
  );
  // DeepSeek로 보내는 모든 메시지(과거 이력 포함)를 가림 처리한다 — 식별정보 미전송 원칙을
  // 현재 메시지 하나만이 아니라 전송되는 전체 텍스트에 일관 적용한다.
  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyRows.map((m) => ({ role: m.role as "user" | "assistant", content: maskPii(m.content) })),
  ];

  let deepseekRes: Response;
  try {
    deepseekRes = await streamDeepSeekChat(chatMessages, internalDeepSeekUserId(authResult.userId));
  } catch {
    return NextResponse.json({ error: "CHAT_FAILED" }, { status: 502 });
  }
  if (!deepseekRes.body) {
    return NextResponse.json({ error: "CHAT_FAILED" }, { status: 502 });
  }

  const [clientStream, captureStream] = deepseekRes.body.tee();
  const conversationIdForStorage = conversationId;
  consumeAndStore(captureStream, conversationIdForStorage, authResult.userId).catch((err) => {
    console.error("chat: failed to store assistant message", err);
  });

  return new Response(clientStream, {
    headers: { "content-type": "text/event-stream", "x-conversation-id": conversationId },
  });
}
