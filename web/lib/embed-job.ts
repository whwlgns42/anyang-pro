import { pool } from "./db";
import { embedBatch, EMBED_BATCH_SIZE } from "./embeddings";

// anyang-backend-api 6절 — 임베딩 파이프라인 본체. `/api/jobs/embed` 핸들러와
// `/api/jobs/collect`(7절 "제안: 수집 잡 직후")가 함께 호출하는 공용 함수로 분리한다.
// notice_chunks.embedding은 NOT NULL(0006 마이그레이션)이라 "embedding IS NULL 큐"가 아니라
// "아직 notice_chunks가 없는 notices"가 임베딩 대기열이다.
const CHUNK_CHAR_LIMIT = 1500; // ponytail: 단순 글자수 분할. 문장 경계 보존은 필요해지면 개선.

export function splitIntoChunks(body: string): string[] {
  if (body.length <= CHUNK_CHAR_LIMIT) return [body];
  const chunks: string[] = [];
  for (let i = 0; i < body.length; i += CHUNK_CHAR_LIMIT) {
    chunks.push(body.slice(i, i + CHUNK_CHAR_LIMIT));
  }
  return chunks;
}

export type EmbedJobResult = { processed_notices: number; embedded_chunks: number };

export async function runEmbedJob(): Promise<EmbedJobResult> {
  const { rows: pending } = await pool.query<{ id: string; title: string; body: string }>(
    `select n.id, n.title, n.body
       from notices n
      where not exists (select 1 from notice_chunks nc where nc.notice_id = n.id)
      order by n.collected_at asc
      limit $1`,
    [EMBED_BATCH_SIZE],
  );

  let embeddedChunks = 0;
  for (const notice of pending) {
    try {
      // 확인 항목 24(1차는 제목+본문만 임베딩) — 청크 분할 전에 제목을 본문 앞에 합친다.
      const chunkTexts = splitIntoChunks(`${notice.title}\n\n${notice.body}`);
      const embeddings = await embedBatch(chunkTexts);
      for (let i = 0; i < chunkTexts.length; i++) {
        await pool.query(
          `insert into notice_chunks (notice_id, chunk_text, embedding, embedding_model)
           values ($1, $2, $3, $4)`,
          [notice.id, chunkTexts[i], JSON.stringify(embeddings[i].embedding), embeddings[i].model],
        );
        embeddedChunks++;
      }
    } catch (err) {
      // 공지 1건 임베딩 실패가 전체 대기열을 막지 않게 한다 — Gemini 호출 실패 자체는
      // embedText 내부의 api_usage_logs 기록(withApiUsageLog)에 이미 남는다.
      console.error(`embed-job: notice ${notice.id} failed`, err);
    }
  }

  return { processed_notices: pending.length, embedded_chunks: embeddedChunks };
}
