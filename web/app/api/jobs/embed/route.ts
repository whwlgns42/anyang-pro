import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireSchedulerSecret } from "@/lib/scheduler-auth";
import { embedBatch, EMBED_BATCH_SIZE } from "@/lib/embeddings";

// anyang-backend-api 6절 — 임베딩 파이프라인. notice_chunks.embedding은 NOT NULL(0006
// 마이그레이션)이라 "embedding IS NULL 큐"가 아니라 "아직 notice_chunks가 없는 notices"가
// 임베딩 대기열이다(user_preferences는 2-2절 PUT과 6절 선호 추출에서 이미 embedding을 채워
// 넣은 채로만 생성되므로 이 잡이 따로 처리할 대상이 없다).
const CHUNK_CHAR_LIMIT = 1500; // ponytail: 단순 글자수 분할. 문장 경계 보존은 필요해지면 개선.

export function splitIntoChunks(body: string): string[] {
  if (body.length <= CHUNK_CHAR_LIMIT) return [body];
  const chunks: string[] = [];
  for (let i = 0; i < body.length; i += CHUNK_CHAR_LIMIT) {
    chunks.push(body.slice(i, i + CHUNK_CHAR_LIMIT));
  }
  return chunks;
}

export async function POST(request: Request) {
  const authError = requireSchedulerSecret(request);
  if (authError) return authError;

  const { rows: pending } = await pool.query<{ id: string; body: string }>(
    `select n.id, n.body
       from notices n
      where not exists (select 1 from notice_chunks nc where nc.notice_id = n.id)
      order by n.collected_at asc
      limit $1`,
    [EMBED_BATCH_SIZE],
  );

  let embeddedChunks = 0;
  for (const notice of pending) {
    const chunkTexts = splitIntoChunks(notice.body);
    const embeddings = await embedBatch(chunkTexts);
    for (let i = 0; i < chunkTexts.length; i++) {
      await pool.query(
        `insert into notice_chunks (notice_id, chunk_text, embedding, embedding_model)
         values ($1, $2, $3, $4)`,
        [notice.id, chunkTexts[i], JSON.stringify(embeddings[i].embedding), embeddings[i].model],
      );
      embeddedChunks++;
    }
  }

  return NextResponse.json({ processed_notices: pending.length, embedded_chunks: embeddedChunks });
}
