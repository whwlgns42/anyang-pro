import type { PoolClient } from "pg";
import type { Attachment } from "./notice-parser";

// anyang-board-collector A-1·C-4 — 공지 1건 저장. 서버 수집기(collector.ts)와 받기 API가 같이 쓴다.
// 규칙은 anyang-backend-api 5-1절 3번: 같은 해시면 메타 4개만, 다르면 upsert + 청크 삭제(재임베딩 대기열), 없으면 삽입.
// 한 항목 = 한 트랜잭션(upsert와 청크 삭제 사이에 끊겨 재임베딩이 영영 안 걸리는 구멍을 막는다).
export type NoticeInput = {
  source_url: string;
  title: string;
  body: string;
  content_hash: string;
  published_at: string | null;
  is_pinned: boolean;
  image_count: number;
  attachments: Attachment[];
};
export type SaveResult = "created" | "updated" | "unchanged";

export async function saveNotice(client: Pick<PoolClient, "query">, n: NoticeInput): Promise<SaveResult> {
  const attachmentsJson = JSON.stringify(n.attachments);
  await client.query("begin");
  try {
    // 같은 글이 동시에 들어와도 순서대로 처리되도록 행을 잠근다(없으면 아래 upsert의 on conflict가 받는다).
    const { rows } = await client.query<{ id: string; content_hash: string }>(
      `select id, content_hash from notices where source_url = $1 for update`,
      [n.source_url],
    );
    const known = rows[0];
    let result: SaveResult;
    if (known && known.content_hash === n.content_hash) {
      // 본문이 같으면 메타데이터 4개만 갱신한다(collected_at·notice_chunks·hidden_at은 그대로).
      await client.query(
        `update notices set is_pinned = $2, image_count = $3, attachments = $4::jsonb, published_at = coalesce($5, published_at)
          where id = $1`,
        [known.id, n.is_pinned, n.image_count, attachmentsJson, n.published_at],
      );
      result = "unchanged";
    } else {
      await client.query(
        `insert into notices (source_url, title, body, content_hash, published_at, is_pinned, image_count, attachments)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         on conflict (source_url) do update
           set title = excluded.title, body = excluded.body, content_hash = excluded.content_hash,
               published_at = coalesce(excluded.published_at, notices.published_at), is_pinned = excluded.is_pinned,
               image_count = excluded.image_count, attachments = excluded.attachments, collected_at = now()`,
        [n.source_url, n.title, n.body, n.content_hash, n.published_at, n.is_pinned, n.image_count, attachmentsJson],
      );
      if (known) {
        // 변경된 공지는 재임베딩 큐에 다시 올라야 한다. notice_chunks.embedding은 NOT NULL이라
        // 기존 청크를 지워 embed-job의 "청크 없는 공지" 대기열에 다시 걸리게 한다.
        await client.query(`delete from notice_chunks where notice_id = $1`, [known.id]);
      }
      result = known ? "updated" : "created";
    }
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  }
}
