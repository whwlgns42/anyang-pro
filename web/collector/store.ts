import { BLOCK_REST_MINUTES, LOCK_KEY, RETRY_LIMIT, STALE_RUNNING_MINUTES } from "./constants";
import type { Attachment } from "../lib/notice-parser";

// anyang-board-collector A-4 / anyang-board-collector-db B-3 — 보드 DB(anyang_collector) SQL. 모두 매개변수 바인딩.
export type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };
export type RunKind = "quick" | "full" | "backfill" | "sync";

export type CollectedInput = {
  source_url: string;
  title: string;
  body: string;
  content_hash: string;
  published_at: string | null;
  is_pinned: boolean;
  image_count: number;
  attachments: Attachment[];
  raw_html: string;
};
export type PendingRow = Omit<CollectedInput, "raw_html"> & { id: string };

export async function tryLock(db: Db): Promise<boolean> {
  const { rows } = await db.query(`select pg_try_advisory_lock($1) as locked`, [LOCK_KEY]);
  return rows[0]?.locked === true;
}

export async function unlock(db: Db): Promise<void> {
  await db.query(`select pg_advisory_unlock($1)`, [LOCK_KEY]);
}

export async function failStale(db: Db): Promise<void> {
  await db.query(
    `update collector_runs set status = 'failed', finished_at = now(), error_summary = 'stale'
      where status = 'running' and started_at < now() - ($1 || ' minutes')::interval`,
    [String(STALE_RUNNING_MINUTES)],
  );
}

// 실행 기록 90일 보존(설계 56(j)). collector_runs만 지운다 - collected_notices·raw_html은 건드리지 않는다.
export async function pruneRuns(db: Db): Promise<void> {
  await db.query(`delete from collector_runs where started_at < now() - interval '90 days' and status <> 'running'`);
}

// 직전 수집 실행(sync 제외). 보고 여부(직전이 실패였는가) 판단에 쓴다.
export async function previousRun(db: Db): Promise<{ status: string; error_summary: string | null } | null> {
  const { rows } = await db.query(
    `select status, error_summary from collector_runs where kind <> 'sync' order by id desc limit 1`,
  );
  return rows[0] ?? null;
}

// 쉬기 판단: 사이트에 실제로 닿은 마지막 실행(쉬기 행 제외)이 ip_blocked이고 BLOCK_REST_MINUTES가 안 지났으면 true.
export async function recentlyBlocked(db: Db): Promise<boolean> {
  const { rows } = await db.query(
    `select error_summary, finished_at > now() - ($1 || ' minutes')::interval as recent
       from collector_runs
      where kind <> 'sync' and status <> 'running' and error_summary is distinct from 'ip_blocked_skipped'
      order by id desc limit 1`,
    [String(BLOCK_REST_MINUTES)],
  );
  return rows[0]?.error_summary === "ip_blocked" && rows[0]?.recent === true;
}

export async function startRun(db: Db, kind: RunKind): Promise<string> {
  const { rows } = await db.query(`insert into collector_runs (kind) values ($1) returning id`, [kind]);
  return String(rows[0].id);
}

export type RunStats = {
  pages_fetched: number;
  found_count: number;
  new_count: number;
  changed_count: number;
  synced_count: number;
  sync_failed_count: number;
};

export async function finishRun(db: Db, id: string, status: "success" | "failed", summary: string | null, s: RunStats) {
  await db.query(
    `update collector_runs set finished_at = now(), status = $2, error_summary = $3, pages_fetched = $4,
            found_count = $5, new_count = $6, changed_count = $7, synced_count = $8, sync_failed_count = $9
      where id = $1`,
    [id, status, summary, s.pages_fetched, s.found_count, s.new_count, s.changed_count, s.synced_count, s.sync_failed_count],
  );
}

export async function existingHashes(db: Db, urls: string[]): Promise<Map<string, string>> {
  const { rows } = await db.query(`select source_url, content_hash from collected_notices where source_url = any($1)`, [urls]);
  return new Map(rows.map((r) => [r.source_url as string, r.content_hash as string]));
}

// 정리 값 7개 중 하나라도 달라졌는지(published_at은 새 값이 null이면 기존 값을 유지하므로 coalesce로 비교).
const CHANGED = `(c.title, c.body, c.content_hash, c.published_at, c.is_pinned, c.image_count, c.attachments)
  is distinct from (excluded.title, excluded.body, excluded.content_hash,
                    coalesce(excluded.published_at, c.published_at), excluded.is_pinned, excluded.image_count, excluded.attachments)`;

// 같은 값이면 collected_at·raw_html만 갱신하고 sync_status는 유지, 달라지면 pending으로 되돌린다(상태 전이 표).
export async function upsertCollected(db: Db, n: CollectedInput): Promise<void> {
  await db.query(
    `insert into collected_notices as c
       (source_url, title, body, content_hash, published_at, is_pinned, image_count, attachments, raw_html)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
     on conflict (source_url) do update set
       sync_status = case when ${CHANGED} then 'pending' else c.sync_status end,
       retry_count = case when ${CHANGED} then 0 else c.retry_count end,
       last_error = case when ${CHANGED} then null else c.last_error end,
       next_attempt_at = case when ${CHANGED} then now() else c.next_attempt_at end,
       title = excluded.title, body = excluded.body, content_hash = excluded.content_hash,
       published_at = coalesce(excluded.published_at, c.published_at), is_pinned = excluded.is_pinned,
       image_count = excluded.image_count, attachments = excluded.attachments,
       raw_html = excluded.raw_html, collected_at = now()`,
    [n.source_url, n.title, n.body, n.content_hash, n.published_at, n.is_pinned, n.image_count, JSON.stringify(n.attachments), n.raw_html],
  );
}

export async function nextBatch(db: Db, limit: number): Promise<PendingRow[]> {
  const { rows } = await db.query(
    `select id::text as id, source_url, title, body, content_hash, to_char(published_at, 'YYYY-MM-DD') as published_at,
            is_pinned, image_count, attachments
       from collected_notices
      where sync_status = 'pending' and next_attempt_at <= now()
      order by id limit $1`,
    [limit],
  );
  return rows;
}

export async function markSynced(db: Db, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.query(
    `update collected_notices set sync_status = 'synced', synced_at = now(), retry_count = 0, last_error = null,
            last_attempt_at = now() where id = any($1::bigint[])`,
    [ids],
  );
}

// 영구 거부(rejected): 재시도 없이 즉시 failed.
export async function markFailed(db: Db, id: string, code: string): Promise<void> {
  await db.query(
    `update collected_notices set sync_status = 'failed', last_error = $2, last_attempt_at = now() where id = $1`,
    [id, code],
  );
}

// 일시 실패: retry_count+1, 백오프 10분 x 2^(이전 retry_count), 상한에 닿으면 failed.
export async function markRetry(db: Db, id: string, error: string): Promise<void> {
  await db.query(
    `update collected_notices set retry_count = retry_count + 1, last_error = $2, last_attempt_at = now(),
            sync_status = case when retry_count + 1 >= $3 then 'failed' else 'pending' end,
            next_attempt_at = now() + interval '10 minutes' * power(2, retry_count)
      where id = $1`,
    [id, error, RETRY_LIMIT],
  );
}
