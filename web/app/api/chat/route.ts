import { createHash } from "node:crypto";
import { NextRequest, NextResponse, after } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";
import { maskPii } from "@/lib/mask-pii";
import { ageBandLabel } from "@/lib/age-band";
import { embedText } from "@/lib/embeddings";
import { streamDeepSeekChat, extractPreferences, type ChatMessage } from "@/lib/deepseek";

// anyang-backend-api 3절 — 채팅 + RAG. DeepSeek 스트리밍 응답을 tee()해 클라이언트로는 원본
// SSE 바이트를 그대로 전달하고, 다른 분기는 서버가 읽어 조립·저장한다(스트림 형식 자체는
// DeepSeek(OpenAI 호환) SSE 그대로 — 3차/frontend가 그 형식을 그대로 파싱해야 한다).
// anyang-backend-api 10절 — DeepSeek 스트리밍 응답이 Fluid Compute 함수 최대 300초 안에 끝나야 한다.
export const maxDuration = 300;

const RAG_TOP_K = 5;
// anyang-backend-api 3-3절(확인 항목 43, 확정) — 최근 N개 + 유사 K개, 합계 최대 10개.
const MEMORY_RECENT_N = 5;
const MEMORY_SIMILAR_K = 5;
const MEMORY_MAX_TOTAL = 10;
// database 설계(user_preferences 절) — 코사인 거리 0.08 미만(유사도 0.92 이상)이면 갱신.
const PREFERENCE_UPDATE_DISTANCE_THRESHOLD = 0.08;

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

// anyang-backend-api 3-3절 — 최근 N개 + 유사 K개(합계 최대 10, 최근 우선, 중복 제거)를
// 채팅 시스템 프롬프트 주입과 3-3-1절 추출의 "기존 기억 목록"에 함께 쓴다. 최근 기억 조회가
// 실패하면 기억 절 자체를 생략하고, 유사 기억 조회만 실패하면 최근 기억만으로 진행한다(폴백).
async function fetchMemories(userId: string, messageEmbedding: number[]): Promise<string[]> {
  let recent: { id: string; preference_text: string }[];
  try {
    const { rows } = await pool.query<{ id: string; preference_text: string }>(
      `select id, preference_text, updated_at from user_preferences
        where user_id = $1 order by updated_at desc limit $2`,
      [userId, MEMORY_RECENT_N],
    );
    recent = rows;
  } catch {
    return [];
  }

  let similar: { id: string; preference_text: string }[];
  try {
    const { rows } = await pool.query<{ id: string; preference_text: string }>(
      `select id, preference_text, embedding <=> $2 as distance from user_preferences
        where user_id = $1 order by embedding <=> $2 limit $3`,
      [userId, JSON.stringify(messageEmbedding), MEMORY_SIMILAR_K],
    );
    similar = rows;
  } catch {
    similar = [];
  }

  const seenIds = new Set<string>();
  const merged: string[] = [];
  for (const row of [...recent, ...similar]) {
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    merged.push(row.preference_text);
    if (merged.length >= MEMORY_MAX_TOTAL) break;
  }
  return merged;
}

// anyang-backend-api 3절 5번·3-3-1절 — consumeAndStore가 답변을 저장한 직후 매번 호출한다
// (기존 6의 배수 게이트는 제거됨). knownFacts는 채팅 요청 시 이미 조회한 fetchMemories 결과를
// 재사용한다(추가 조회 없음). 저장은 database 설계의 중복 방지·갱신 쿼리(UPDATE 실패 시 INSERT)를 따른다.
async function extractAndStorePreference(
  conversationId: string,
  userId: string,
  userMessage: string,
  assistantText: string,
  knownFacts: string[],
): Promise<void> {
  const conversationText = `사용자: ${maskPii(userMessage)}\n어시스턴트: ${maskPii(assistantText)}`;

  let facts: string[];
  try {
    facts = await extractPreferences(conversationText, knownFacts);
  } catch {
    return; // 선호 추출 실패는 채팅 자체를 실패시키지 않는다(부가 기능)
  }

  for (const fact of facts) {
    const maskedFact = maskPii(fact);
    try {
      const embedded = await embedText(maskedFact);
      const embeddingJson = JSON.stringify(embedded.embedding);
      const updateResult = await pool.query<{ id: string }>(
        `update user_preferences
            set preference_text = $2, embedding = $3, embedding_model = $4,
                source_conversation_id = $5, updated_at = now()
          where id = (
            select id from user_preferences where user_id = $1 order by embedding <=> $3 limit 1
          )
            and (embedding <=> $3) < $6
          returning id`,
        [userId, maskedFact, embeddingJson, embedded.model, conversationId, PREFERENCE_UPDATE_DISTANCE_THRESHOLD],
      );
      if (updateResult.rows.length === 0) {
        await pool.query(
          `insert into user_preferences (user_id, preference_text, embedding, embedding_model, source_conversation_id)
           values ($1, $2, $3, $4, $5)`,
          [userId, maskedFact, embeddingJson, embedded.model, conversationId],
        );
      }
    } catch {
      // 임베딩/저장 실패 시 이 문장만 건너뛴다.
    }
  }
}

export async function consumeAndStore(
  stream: ReadableStream<Uint8Array>,
  conversationId: string,
  userId: string,
  userMessage: string,
  knownFacts: string[],
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";

  try {
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
  } catch {
    // anyang-backend-api 3-3-2절(확인 항목 43-b) — 스트림 읽기 중 예외·중단(취소 포함)이 나도
    // 그때까지 모은 assistantText가 있으면 아래에서 저장을 시도한다. 잘린 답변 표시는 두지 않는다.
  }

  if (assistantText) {
    await pool.query(`insert into messages (conversation_id, role, content) values ($1, 'assistant', $2)`, [
      conversationId,
      assistantText,
    ]);
    await pool.query(`update conversations set updated_at = now() where id = $1`, [conversationId]);
    await extractAndStorePreference(conversationId, userId, userMessage, assistantText, knownFacts);
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

  let messageEmbedding: number[];
  let queryVector: number[];
  try {
    const embedded = await embedText(maskedMessage);
    messageEmbedding = embedded.embedding;
    queryVector = await buildQueryVector(authResult.userId, embedded.embedding);
  } catch {
    return NextResponse.json({ error: "EMBEDDING_FAILED" }, { status: 502 });
  }

  // anyang-backend-api 3-3절(확인 항목 43) — 가공 전 원본 메시지 임베딩을 재사용(추가 임베딩
  // 호출 없음). 이 목록은 아래 프롬프트 주입과 3-3-1절 추출의 "기존 기억 목록"에 함께 쓴다.
  const memories = await fetchMemories(authResult.userId, messageEmbedding);

  const { rows: notices } = await pool.query<{
    id: string;
    title: string;
    source_url: string;
    published_at: string | null;
    chunk_text: string;
  }>(
    `select n.id, n.title, n.source_url, n.published_at, nc.chunk_text
       from notice_chunks nc
       join notices n on n.id = nc.notice_id
      where n.hidden_at is null
      order by nc.embedding <=> $1
      limit $2`,
    [JSON.stringify(queryVector), RAG_TOP_K],
  );

  // anyang-backend-api 3-2절 — 인용 공지 목록. 같은 notice_id는 먼저 나온(유사도가 높은) 1건만 남긴다.
  const seenNoticeIds = new Set<string>();
  const citations = notices
    .filter((n) => {
      if (seenNoticeIds.has(n.id)) return false;
      seenNoticeIds.add(n.id);
      return true;
    })
    .map((n) => ({ id: n.id, title: n.title, source_url: n.source_url, posted_at: n.published_at }));

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
  // anyang-backend-api 3절(확인 항목 28) — 출생연도 원값 대신 나이대 구간 문자열만 프롬프트에
  // 넣는다. birth_year가 null이면 나이대 조건 자체를 생략한다(제안).
  const ageBand = profile ? ageBandLabel(profile.birth_year) : null;
  const conditionText = profile
    ? [
        ageBand ? `나이대: ${ageBand}` : null,
        `성별: ${profile.gender ?? "미상"}`,
        `직군: ${profile.occupation_type ?? "미상"}`,
        `재학재직: ${profile.enrollment_status ?? "미상"}`,
      ]
        .filter(Boolean)
        .join(", ")
    : "사용자 조건 정보 없음";
  const noticesText = notices.length
    ? notices.map((n, i) => `[${i + 1}] ${n.title}\n${n.chunk_text}`).join("\n\n")
    : "(관련 공지 없음)";

  // anyang-backend-api 3-3절(확인 항목 43) — 기억이 1건 이상이면 "사용자 조건" 절과 "관련
  // 공지" 절 사이에 끼워 넣는다. 0건이면 헤더를 포함해 절 전체를 생략한다.
  const memoryBlock = memories.length
    ? `\n\n기억하는 사용자 정보:\n${memories.map((m) => `- ${m}`).join("\n")}`
    : "";

  const systemPrompt =
    "당신은 안양시 청년정책 안내 비서입니다. 아래 사용자 조건에 맞는 공지를 우선 언급하며 " +
    `답하세요.\n\n사용자 조건 - ${conditionText}${memoryBlock}\n\n관련 공지:\n${noticesText}`;

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
  const runConsumeAndStore = () =>
    consumeAndStore(captureStream, conversationIdForStorage, authResult.userId, message, memories).catch((err) => {
      console.error("chat: failed to store assistant message", err);
    });
  // Vercel 서버리스 함수는 응답을 반환하면 곧바로 종료될 수 있어, await 없는 fire-and-forget
  // 호출은 저장이 끝나기 전에 함수가 잘릴 위험이 있다. after()로 응답 이후에도 완료를 보장한다.
  // 요청 스코프 밖(유닛 테스트 등)에서는 after()가 던지므로 기존 fire-and-forget으로 폴백한다.
  try {
    after(runConsumeAndStore);
  } catch {
    void runConsumeAndStore();
  }

  // 3-2절 — 인용 이벤트를 DeepSeek 청크보다 먼저, 대화당 1회만 보낸다. 빈 목록도 `data: []`로 전송.
  const citationsEvent = `event: citations\ndata: ${JSON.stringify(citations)}\n\n`;
  const withCitations = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(new TextEncoder().encode(citationsEvent));
      const reader = clientStream.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
    },
  });

  return new Response(withCitations, {
    headers: { "content-type": "text/event-stream", "x-conversation-id": conversationId },
  });
}
