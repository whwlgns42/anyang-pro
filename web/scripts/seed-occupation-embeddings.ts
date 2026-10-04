// anyang-backend-api 7-2절 / anyang-database-schema "직군 문장 벡터" — 직군 문장 7개를 임베딩해
// occupation_embeddings에 upsert하는 1회성 스크립트. 문장을 바꾸면 다시 실행한다.
// 실행: npx tsx --env-file=.env.local scripts/seed-occupation-embeddings.ts
// 운영 DB에 쓰므로 실행은 사용자 승인 뒤에만 한다.
import { embedText } from "../lib/embeddings";
import { OCCUPATION_SENTENCES } from "../lib/occupation-sentences";
import { pool } from "../lib/db";

type Query = (sql: string, params: unknown[]) => Promise<unknown>;

export async function seedOccupationEmbeddings(embed: typeof embedText, query: Query): Promise<number> {
  const entries = Object.entries(OCCUPATION_SENTENCES);
  for (const [code, sentence] of entries) {
    const { embedding, model } = await embed(sentence);
    await query(
      `insert into occupation_embeddings (code, sentence, embedding, embedding_model)
       values ($1, $2, $3, $4)
       on conflict (code) do update
         set sentence = excluded.sentence, embedding = excluded.embedding,
             embedding_model = excluded.embedding_model, updated_at = now()`,
      [code, sentence, JSON.stringify(embedding), model],
    );
  }
  return entries.length;
}

if (process.argv[1]?.endsWith("seed-occupation-embeddings.ts")) {
  seedOccupationEmbeddings(embedText, (sql, params) => pool.query(sql, params))
    .then((n) => console.log(`직군 문장 ${n}건 upsert 완료`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
