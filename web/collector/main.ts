import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { isPathDisallowed, parseRobotsTxt } from "../lib/robots";
import {
  BOARD_ORIGIN,
  BOARD_PATH,
  BOARD_URL,
  DEFAULT_REQUEST_DELAY_MS,
  contentHash,
  hasDetailContent,
  isBlockedPage,
  parseDetailPage,
  parseListPage,
  userAgent,
} from "../lib/notice-parser";
import {
  BACKFILL_LAST_PAGE,
  BATCH_BYTE_LIMIT,
  BATCH_SIZE,
  MAX_BATCHES_QUICK_FULL,
  MAX_EMBED_CALLS,
  SITE_TIMEOUT_MS,
} from "./constants";
import { makeIngestClient } from "./ingest-client";
import * as store from "./store";
import type { Db, PendingRow, RunKind, RunStats } from "./store";

// anyang-board-collector A-4 — 보드 수집기 명령·흐름. 번들(anyang-collector.mjs)의 진입점이다.
// 사용: anyang-collector.mjs quick | full | backfill --from N --to M [--no-sync] | sync | <명령> --dry-run

export type Args = { kind: RunKind; from?: number; to?: number; noSync: boolean; dryRun: boolean };
type ReportCode = "ip_blocked" | "empty_list" | "parse_failed" | "fetch_failed" | "robots_disallowed";

export type Deps = {
  connect: () => Promise<Db & { end: () => Promise<void> }>;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  env: Record<string, string | undefined>;
  log: (line: string) => void;
};

export function parseArgs(argv: string[]): Args | string {
  const [kind, ...rest] = argv;
  if (kind !== "quick" && kind !== "full" && kind !== "backfill" && kind !== "sync") {
    return "usage: quick | full | backfill --from N --to M [--no-sync] | sync  (+ --dry-run)";
  }
  const args: Args = { kind, noSync: false, dryRun: false };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--no-sync") args.noSync = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--from" || a === "--to") {
      const v = rest[++i];
      if (!/^\d+$/.test(v ?? "")) return `${a} needs a positive integer`;
      args[a === "--from" ? "from" : "to"] = Number(v);
    } else return `unknown option ${a}`;
  }
  if (kind === "backfill" && !args.dryRun) {
    const { from, to } = args;
    if (from === undefined || to === undefined || from < 1 || to > BACKFILL_LAST_PAGE || from > to) {
      return `backfill needs --from N --to M within 1..${BACKFILL_LAST_PAGE}`;
    }
  }
  if (kind === "sync" && args.noSync) return "sync with --no-sync does nothing";
  return args;
}

class CollectFail extends Error {
  constructor(public code: ReportCode) {
    super(code);
  }
}

// 사이트에 닿는 요청 도구. robots.txt 다음 모든 요청 앞에 간격을 둔다(맨 처음 제외).
async function makeSiteClient(deps: Deps) {
  const headers = { "user-agent": userAgent() };
  const fetchText = async (url: string): Promise<{ ok: boolean; text: string }> => {
    try {
      const res = await deps.fetch(url, { headers, signal: AbortSignal.timeout(SITE_TIMEOUT_MS) });
      return { ok: res.ok, text: res.ok ? await res.text() : "" };
    } catch {
      throw new CollectFail("fetch_failed");
    }
  };
  const robots = await fetchText(`${BOARD_ORIGIN}/robots.txt`);
  const rules = parseRobotsTxt(robots.ok ? robots.text : "");
  if (isPathDisallowed(rules, BOARD_PATH)) throw new CollectFail("robots_disallowed");
  const delayMs = rules.crawlDelaySeconds != null ? rules.crawlDelaySeconds * 1000 : DEFAULT_REQUEST_DELAY_MS;
  let requests = 1;
  const get = async (url: string): Promise<string> => {
    await deps.sleep(delayMs);
    requests++;
    const r = await fetchText(url);
    if (!r.ok) throw new CollectFail("fetch_failed");
    if (isBlockedPage(r.text)) throw new CollectFail("ip_blocked");
    return r.text;
  };
  return { get, requests: () => requests };
}

// F-3 시험용: 목록 1페이지를 받아 파싱 결과만 출력한다. DB·받기 API에 닿지 않는다.
async function dryRun(deps: Deps): Promise<number> {
  try {
    const site = await makeSiteClient(deps);
    const items = parseListPage(await site.get(`${BOARD_URL}&pageIndex=1`));
    if (items.length === 0) throw new CollectFail("empty_list");
    deps.log(`dry-run: ok requests=${site.requests()} items=${items.length} pinned=${items.filter((i) => i.isPinned).length}`);
    return 0;
  } catch (err) {
    deps.log(`dry-run: failed ${err instanceof CollectFail ? err.code : "unexpected"}`);
    return 1;
  }
}

type Ctx = {
  args: Args;
  deps: Deps;
  db: Db;
  st: RunStats & { failure: string | null; reportCode: ReportCode | null; lastRemaining: number | null };
  blockedRest: boolean;
  previousFailed: boolean;
};

async function collect(c: Ctx): Promise<void> {
  const { args, deps, db, st } = c;
  if (c.blockedRest) {
    st.failure = "ip_blocked_skipped"; // 이전 실행이 차단당한 지 BLOCK_REST_MINUTES가 안 지났다. 사이트에 요청하지 않는다.
    deps.log("collect: skipped (recently blocked)");
    return;
  }
  const [fromPage, toPage] =
    args.kind === "quick" ? [1, 1] : args.kind === "full" ? [1, 2] : [args.from ?? 1, args.to ?? BACKFILL_LAST_PAGE];
  let parseFailed = 0;
  try {
    const site = await makeSiteClient(deps);
    const seen = new Set<string>();
    for (let page = fromPage; page <= toPage; page++) {
      const items = parseListPage(await site.get(`${BOARD_URL}&pageIndex=${page}`)).filter((i) => !seen.has(i.url));
      st.pages_fetched++;
      // 첫 목록 페이지가 0건이면 구조 변경·차단 등이라 성공이 아니다. 이후 빈 페이지는 게시판 끝이다.
      if (items.length === 0 && page === fromPage) throw new CollectFail("empty_list");
      if (items.length === 0) break;
      items.forEach((i) => seen.add(i.url));
      st.found_count += items.length;

      const known = await store.existingHashes(db, items.map((i) => i.url));
      for (const item of items) {
        const oldHash = known.get(item.url);
        // quick·backfill은 보드에 이미 있는 글을 건너뛴다. full은 모든 행의 상세를 다시 받는다.
        if (oldHash !== undefined && args.kind !== "full") continue;

        const html = await site.get(item.url);
        if (!hasDetailContent(html)) {
          parseFailed++;
          continue;
        }
        const d = parseDetailPage(html);
        const title = d.title || item.title;
        const hash = contentHash(title, d.body);
        await store.upsertCollected(db, {
          source_url: item.url,
          title,
          body: d.body,
          content_hash: hash,
          published_at: item.publishedAt,
          is_pinned: item.isPinned,
          image_count: d.imageCount,
          attachments: d.attachments,
          raw_html: html,
        });
        if (oldHash === undefined) st.new_count++;
        else if (oldHash !== hash) st.changed_count++;
      }
    }
    if (parseFailed > 0) throw new CollectFail("parse_failed");
  } catch (err) {
    if (err instanceof CollectFail) {
      st.failure = err.code;
      st.reportCode = err.code;
    } else {
      // 보드 DB 오류 등 사이트 요청 실패가 아닌 것: Vercel에 보고하지 않고 보드 collector_runs에만 남긴다.
      st.failure = "unexpected";
    }
    deps.log(`collect: failed ${st.failure}`);
  }
}

// 응답 해석 표(A-4 5번). 배치를 못 보내면 이유를 failure에 남기고 전송을 멈춘다.
async function transmit(c: Ctx, ingest: ReturnType<typeof makeIngestClient>): Promise<void> {
  const { args, deps, db, st } = c;
  const maxBatches = args.kind === "quick" || args.kind === "full" ? MAX_BATCHES_QUICK_FULL : Infinity;
  for (let n = 0; n < maxBatches; n++) {
    const rows = await store.nextBatch(db, BATCH_SIZE);
    if (rows.length === 0) return;
    const batch = trimToBytes(rows);
    const retryAll = async (why: string) => {
      for (const r of batch) await store.markRetry(db, r.id, why);
    };

    let res;
    try {
      res = await ingest.notices({ kind: args.kind, items: batch.map(({ id: _id, ...item }) => item) });
    } catch {
      await retryAll("network");
      st.failure ??= "ingest_unavailable";
      return;
    }
    if (res.status === 401) {
      st.failure ??= "ingest_auth"; // 키 설정 오류는 항목의 잘못이 아니다. 항목 상태·재시도 횟수를 바꾸지 않는다.
      return;
    }
    if (res.status >= 500) {
      await retryAll(`http_${res.status}`);
      st.failure ??= "ingest_unavailable";
      return;
    }
    if (res.status !== 200) {
      st.failure ??= "ingest_bad_request"; // 400/413 등: 보드 버그 신호. 항목 상태 불변.
      return;
    }
    const results: { result?: string; code?: string }[] | undefined = res.json?.results;
    if (!Array.isArray(results) || results.length !== batch.length) {
      await retryAll("bad_response");
      st.failure ??= "ingest_unavailable";
      return;
    }
    const synced: string[] = [];
    for (let i = 0; i < batch.length; i++) {
      const r = results[i];
      // 항목 형식이 어긋나면(null 등) 그 항목만 일시 오류로 다룬다.
      if (!r || typeof r !== "object") await store.markRetry(db, batch[i].id, "bad_item");
      else if (r.result === "created" || r.result === "updated" || r.result === "unchanged") synced.push(batch[i].id);
      else if (r.result === "rejected") {
        await store.markFailed(db, batch[i].id, typeof r.code === "string" ? r.code : "rejected");
        st.sync_failed_count++;
      } else await store.markRetry(db, batch[i].id, typeof r.code === "string" ? r.code : "error");
    }
    await store.markSynced(db, synced);
    st.synced_count += synced.length;
    st.lastRemaining = typeof res.json.remaining_unembedded === "number" ? res.json.remaining_unembedded : null;
    deps.log(`sync: batch=${n + 1} sent=${batch.length} synced=${synced.length}`);
  }
}

// 요청 본문 4MB 한도 아래로 배치를 자른다(항목이 커서 20건이 넘칠 때). 최소 1건은 보낸다.
function trimToBytes(rows: PendingRow[]): PendingRow[] {
  let total = 0;
  const out: PendingRow[] = [];
  for (const r of rows) {
    total += Buffer.byteLength(JSON.stringify(r));
    if (out.length > 0 && total > BATCH_BYTE_LIMIT) break;
    out.push(r);
  }
  return out;
}

async function runLocked(args: Args, deps: Deps, db: Db, cfg: { url: string; secret: string }): Promise<number> {
  await store.pruneRuns(db).catch(() => deps.log("prune: failed")); // 실패해도 실행은 계속한다.
  await store.failStale(db);
  const prev = await store.previousRun(db);
  const blockedRest = args.kind === "sync" ? false : await store.recentlyBlocked(db);
  const runId = await store.startRun(db, args.kind);
  const c: Ctx = {
    args,
    deps,
    db,
    blockedRest,
    previousFailed: prev?.status === "failed",
    st: {
      pages_fetched: 0, found_count: 0, new_count: 0, changed_count: 0, synced_count: 0, sync_failed_count: 0,
      failure: null, reportCode: null, lastRemaining: null,
    },
  };
  const ingest = makeIngestClient(cfg.url, cfg.secret, deps.fetch);

  try {
    if (args.kind !== "sync") await collect(c);
    // 수집이 실패했어도 대기열 전송은 한다. --no-sync만 건너뛴다.
    if (!args.noSync) await transmit(c, ingest);

    // 보고(항목 없는 호출): full은 성공·실패 모두 매일 한 번(보고 대상이 아닌 실패는 보내지 않음),
    // quick은 직전이 실패가 아니었는데 이번에 실패했을 때만(성공 보고 없음).
    const { reportCode } = c.st;
    const report = reportCode
      ? args.kind === "full" || (args.kind === "quick" && !c.previousFailed)
        ? { status: "failed", error_code: reportCode }
        : null
      : args.kind === "full" && !c.st.failure
        ? { status: "success" }
        : null;
    if (report) {
      try {
        const r = await ingest.notices({ kind: args.kind, items: [], report });
        deps.log(`report: ${report.status} status=${r.status}`);
      } catch {
        deps.log("report: not delivered");
      }
    }

    // 남은 임베딩(실패해도 수집·전송 결과에 영향 없음).
    if ((c.st.lastRemaining ?? 0) > 0) {
      for (let i = 0; i < MAX_EMBED_CALLS; i++) {
        try {
          const r = await ingest.embed();
          if (r.status !== 200 || !(r.json?.embedded_chunks > 0)) break;
        } catch {
          break;
        }
      }
    }
  } catch (err) {
    c.st.failure ??= "unexpected";
    deps.log(`error: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`);
  }

  const { failure, reportCode: _r, lastRemaining: _l, ...stats } = c.st;
  await store.finishRun(db, runId, failure ? "failed" : "success", failure, stats);
  deps.log(`done: ${args.kind} status=${failure ? "failed" : "success"}${failure ? ` (${failure})` : ""} found=${stats.found_count} new=${stats.new_count} changed=${stats.changed_count} synced=${stats.synced_count}`);
  return failure ? 1 : 0;
}

export async function run(args: Args, deps: Deps): Promise<number> {
  if (args.dryRun) return dryRun(deps);

  const url = deps.env.COLLECTOR_INGEST_URL?.trim();
  const secret = deps.env.COLLECTOR_INGEST_SECRET?.trim();
  // PGPORT·PGDATABASE가 없으면 libpq 기본값(5432, 기존 클러스터)으로 붙는다 - 잘못된 DB에 닿지 않게 막는다.
  const missing = [
    ["COLLECTOR_INGEST_URL", url],
    ["COLLECTOR_INGEST_SECRET", secret],
    ["PGDATABASE", deps.env.PGDATABASE?.trim()],
    ["PGPORT", deps.env.PGPORT?.trim()],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0 || !url || !secret) {
    deps.log(`config missing: ${missing.join(", ")}`);
    return 1;
  }

  const db = await deps.connect();
  try {
    if (!(await store.tryLock(db))) {
      deps.log("another run holds the lock, exiting");
      return 0;
    }
    try {
      return await runLocked(args, deps, db, { url, secret });
    } finally {
      await store.unlock(db).catch(() => {});
    }
  } finally {
    await db.end().catch(() => {});
  }
}

async function cli(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args === "string") {
    console.error(args);
    process.exitCode = 2;
    return;
  }
  try {
    process.exitCode = await run(args, {
      // 접속 정보는 libpq 표준 변수(PGHOST·PGPORT·PGDATABASE·PGUSER)로 받는다. 비밀번호 없음(peer).
      connect: async () => {
        const client = new pg.Client();
        await client.connect();
        return client;
      },
      fetch: globalThis.fetch,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      env: process.env,
      log: (line) => console.log(line),
    });
  } catch (err) {
    console.error(`fatal: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`);
    process.exitCode = 1;
  }
}

// 번들을 직접 실행했을 때만 CLI를 돈다(테스트가 import할 때는 돌지 않는다).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void cli();
