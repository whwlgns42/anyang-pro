import { pool } from "./db";
import { parseRobotsTxt, isPathDisallowed } from "./robots";
import { saveNotice } from "./notice-store";
import {
  BOARD_ORIGIN,
  BOARD_PATH,
  BOARD_URL,
  DEFAULT_REQUEST_DELAY_MS,
  contentHash,
  isBlockedPage,
  parseDetailPage,
  parseListPage,
  userAgent,
} from "./notice-parser";

// anyang-board-collector A-1 — 파서는 notice-parser로 옮겼다. 기존 import 경로(@/lib/collector)를 유지하려고 다시 내보낸다.
export * from "./notice-parser";

// 5-1절 4번 — 겹침 방지용 트랜잭션 advisory lock 키(임의의 고정 상수).
const COLLECT_LOCK_KEY = 5517042;
const STALE_RUNNING_MINUTES = 10;
const DEFAULT_BACKFILL_LAST_PAGE = 47;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CollectMode = "quick" | "full" | "backfill";
export type CollectOptions = { mode: CollectMode; fromPage?: number; toPage?: number; skipExisting?: boolean };

export type CollectResult =
  | { ok: true; collectedCount: number }
  | { ok: false; reason: "ROBOTS_DISALLOWED" | "COLLECT_FAILED" | "ALREADY_RUNNING"; errorSummary: string };

// 5-1절 4번 — "검사 + insert" 구간만 트랜잭션 락으로 직렬화하고, 실행 중임은 running 행이 알린다.
async function startRun(triggerType: string, triggeredBy: string | null): Promise<string | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const lock = await client.query<{ locked: boolean }>(`select pg_try_advisory_xact_lock($1) as locked`, [
      COLLECT_LOCK_KEY,
    ]);
    if (!lock.rows[0]?.locked) {
      await client.query("rollback");
      return null;
    }
    await client.query(
      `update collect_runs set status = 'failed', finished_at = now(), error_summary = 'STALE_RUNNING'
        where status = 'running' and finished_at is null
          and started_at < now() - ($1 || ' minutes')::interval`,
      [String(STALE_RUNNING_MINUTES)],
    );
    const running = await client.query(
      `select 1 from collect_runs where status = 'running' and finished_at is null limit 1`,
    );
    if (running.rows.length > 0) {
      await client.query("rollback");
      return null;
    }
    const inserted = await client.query<{ id: string }>(
      `insert into collect_runs (trigger_type, status, triggered_by) values ($1, 'running', $2) returning id`,
      [triggerType, triggeredBy],
    );
    await client.query("commit");
    return inserted.rows[0].id;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function pageRange(opts: CollectOptions): [number, number] {
  if (opts.mode === "quick") return [1, 1];
  if (opts.mode === "full") return [1, 2];
  return [opts.fromPage ?? 1, opts.toPage ?? DEFAULT_BACKFILL_LAST_PAGE];
}

// opts를 생략하면 full과 같다(5-1절 2번).
export async function runCollectJob(
  triggerType: "scheduled" | "manual",
  triggeredBy: string | null,
  opts: CollectOptions = { mode: "full" },
): Promise<CollectResult> {
  const runId = await startRun(triggerType, triggeredBy);
  if (!runId) return { ok: false, reason: "ALREADY_RUNNING", errorSummary: "ALREADY_RUNNING" };

  try {
    const headers = { "user-agent": userAgent() };
    const robotsRes = await fetch(`${BOARD_ORIGIN}/robots.txt`, { headers });
    const robotsText = robotsRes.ok ? await robotsRes.text() : "";
    const rules = parseRobotsTxt(robotsText);
    if (isPathDisallowed(rules, BOARD_PATH)) {
      await pool.query(
        `update collect_runs set finished_at = now(), status = 'failed', error_summary = $2 where id = $1`,
        [runId, "robots.txt disallow"],
      );
      return { ok: false, reason: "ROBOTS_DISALLOWED", errorSummary: "robots.txt disallow" };
    }
    const delayMs = rules.crawlDelaySeconds != null ? rules.crawlDelaySeconds * 1000 : DEFAULT_REQUEST_DELAY_MS;

    // robots.txt 다음의 모든 요청(목록 포함) 앞에 간격을 둔다.
    const getHtml = async (url: string): Promise<string> => {
      await sleep(delayMs);
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      const html = await res.text();
      // anyang-board-collector D — 차단 안내 페이지는 200으로 오므로 본문으로 판정한다. 성공으로 남기지 않는다.
      if (isBlockedPage(html)) throw new Error("ip_blocked");
      return html;
    };

    const skipExisting = opts.mode === "quick" || (opts.mode === "backfill" && opts.skipExisting === true);
    const [fromPage, toPage] = pageRange(opts);
    const seen = new Set<string>();
    let collectedCount = 0;

    for (let page = fromPage; page <= toPage; page++) {
      const items = parseListPage(await getHtml(`${BOARD_URL}&pageIndex=${page}`)).filter((i) => !seen.has(i.url));
      // 첫 목록 페이지가 0건이면 구조 변경·차단 등이라 성공이 아니다. 이후 빈 페이지는 게시판 끝이다.
      if (items.length === 0 && page === fromPage) throw new Error("empty_list");
      if (items.length === 0) break; // 빈 페이지면 남은 페이지는 요청하지 않는다.
      items.forEach((i) => seen.add(i.url));

      // 숨김 공지도 포함해 한 번에 조회한다(숨김 글을 다시 받지 않는다).
      const { rows: existingRows } = await pool.query<{ id: string; source_url: string; content_hash: string }>(
        `select id, source_url, content_hash from notices where source_url = any($1)`,
        [items.map((i) => i.url)],
      );
      const existing = new Map(existingRows.map((r) => [r.source_url, r]));

      for (const item of items) {
        const known = existing.get(item.url);
        if (known && skipExisting) continue;

        const detail = parseDetailPage(await getHtml(item.url));
        const title = detail.title || item.title;
        const client = await pool.connect();
        try {
          const saved = await saveNotice(client, {
            source_url: item.url,
            title,
            body: detail.body,
            content_hash: contentHash(title, detail.body),
            published_at: item.publishedAt,
            is_pinned: item.isPinned,
            image_count: detail.imageCount,
            attachments: detail.attachments,
          });
          if (saved !== "unchanged") collectedCount++;
        } finally {
          client.release();
        }
      }
    }

    await pool.query(
      `update collect_runs set finished_at = now(), status = 'success', collected_count = $2 where id = $1`,
      [runId, collectedCount],
    );
    return { ok: true, collectedCount };
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message.slice(0, 500) : "unknown error";
    await pool.query(
      `update collect_runs set finished_at = now(), status = 'failed', error_summary = $2 where id = $1`,
      [runId, errorSummary],
    );
    return { ok: false, reason: "COLLECT_FAILED", errorSummary };
  }
}
