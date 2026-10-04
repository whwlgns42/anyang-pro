import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { parseArgs, run, type Args, type Deps } from "@/collector/main";
import { contentHash } from "@/lib/notice-parser";

// anyang-board-collector F-1 — 보드 수집기 목 테스트(pg·fetch·sleep 목, 실제 사이트·DB 미사용).
const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf-8");
const ROW = (ntt: number, cls = "") =>
  `<tr${cls}><td>1</td><td class="p-subject"><a href="./selectBbsNttView.do?key=3543&amp;bbsNo=1184&amp;nttNo=${ntt}">공지${ntt}</a></td><td></td><td>0</td><td><time>2026-09-01</time></td></tr>`;
const listHtml = (...rows: string[]) => `<table class="p-table"><tbody>${rows.join("")}</tbody></table>`;
const detailHtml = (body = "본문") =>
  `<table><tbody><tr><td><span class="p-table__subject_text">공지</span></td></tr><tr><td class="p-table__content">${body}</td></tr></tbody></table>`;
const urlFor = (n: number) => `https://www.anyang.go.kr/youth/selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=${n}`;
const SECRET = "board-test-secret-xyz";
const INGEST = "https://app.example.test";

type Pending = { id: string; source_url: string; title: string; body: string; content_hash: string; published_at: string | null; is_pinned: boolean; image_count: number; attachments: unknown[] };
const pending = (id: number): Pending => ({
  id: String(id), source_url: urlFor(id), title: `공지${id}`, body: `비밀본문${id}`,
  content_hash: contentHash(`공지${id}`, `비밀본문${id}`), published_at: "2026-09-01", is_pinned: false, image_count: 0, attachments: [],
});

type DbOpts = {
  locked?: boolean;
  prev?: { status: string; error_summary: string | null } | null;
  recentBlock?: boolean;
  existing?: Record<string, string>;
  batches?: Pending[][];
};
function makeDb(o: DbOpts = {}) {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const batches = [...(o.batches ?? [])];
  const db = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked: o.locked ?? true }] };
      if (sql.includes("insert into collector_runs")) return { rows: [{ id: 7 }] };
      if (sql.includes("finished_at >")) return { rows: o.recentBlock ? [{ error_summary: "ip_blocked", recent: true }] : [] };
      if (sql.includes("order by id desc limit 1")) return { rows: o.prev ? [o.prev] : [] };
      if (sql.includes("source_url = any")) {
        return { rows: Object.entries(o.existing ?? {}).map(([source_url, content_hash]) => ({ source_url, content_hash })) };
      }
      if (sql.includes("from collected_notices")) return { rows: batches.shift() ?? [] };
      return { rows: [] };
    }),
    end: vi.fn(async () => {}),
  };
  const find = (needle: string) => calls.filter((c) => c.sql.includes(needle));
  const finish = () => {
    const f = find("update collector_runs set finished_at")[0];
    return f ? { status: f.params![1], summary: f.params![2] } : null;
  };
  return { db, calls, find, finish };
}

type Net = {
  site?: (url: string) => Response | Promise<Response>;
  ingest?: (path: string, body: any) => Response | Promise<Response>;
};
function makeEnv(net: Net, dbo: DbOpts = {}) {
  const d = makeDb(dbo);
  const requests: { url: string; body?: any; headers?: Record<string, string> }[] = [];
  const sleeps: number[] = [];
  const logs: string[] = [];
  const fetchFn = vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(init.body) : undefined;
    requests.push({ url: u, body, headers: init?.headers });
    if (u.startsWith(INGEST)) {
      return (await net.ingest?.(u.slice(INGEST.length), body)) ?? json(200, { results: [], collected_count: 0, remaining_unembedded: 0 });
    }
    if (u.includes("robots.txt")) return new Response("User-agent: *\n", { status: 200 });
    return (await net.site?.(u)) ?? new Response(listHtml(), { status: 200 });
  });
  const deps: Deps = {
    connect: async () => d.db,
    fetch: fetchFn as unknown as typeof fetch,
    sleep: async (ms) => void sleeps.push(ms),
    env: { COLLECTOR_INGEST_URL: INGEST, COLLECTOR_INGEST_SECRET: SECRET, PGDATABASE: "anyang_collector", PGPORT: "5433" },
    log: (l) => void logs.push(l),
  };
  const siteReqs = () => requests.filter((r) => r.url.includes("anyang.go.kr"));
  const ingestReqs = () => requests.filter((r) => r.url.startsWith(INGEST));
  return { ...d, deps, requests, sleeps, logs, siteReqs, ingestReqs };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const args = (kind: Args["kind"], over: Partial<Args> = {}): Args => ({ kind, noSync: false, dryRun: false, ...over });
const okResults = (n: number, result = "created") => ({ results: Array.from({ length: n }, () => ({ result })), collected_count: n, remaining_unembedded: 0 });

describe("parseArgs", () => {
  it("accepts commands and options, rejects bad input", () => {
    expect(parseArgs(["quick"])).toMatchObject({ kind: "quick", noSync: false, dryRun: false });
    expect(parseArgs(["backfill", "--from", "1", "--to", "47", "--no-sync"])).toMatchObject({ kind: "backfill", from: 1, to: 47, noSync: true });
    expect(parseArgs(["quick", "--dry-run"])).toMatchObject({ dryRun: true });
    for (const bad of [[], ["weekly"], ["backfill"], ["backfill", "--from", "5", "--to", "2"], ["backfill", "--from", "1", "--to", "48"], ["quick", "--x"], ["sync", "--no-sync"]]) {
      expect(typeof parseArgs(bad)).toBe("string");
    }
  });
});

describe("board collector run", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("exits 0 without any request when the advisory lock is held", async () => {
    const e = makeEnv({}, { locked: false });
    expect(await run(args("quick"), e.deps)).toBe(0);
    expect(e.requests).toHaveLength(0);
    expect(e.find("insert into collector_runs")).toHaveLength(0);
  });

  it("prunes collector_runs older than 90 days right after the lock; a failure does not stop the run", async () => {
    const e = makeEnv({ site: () => new Response(listHtml(ROW(1)), { status: 200 }) }, { existing: { [urlFor(1)]: "h" } });
    const q = e.db.query.getMockImplementation()!;
    e.db.query.mockImplementation(async (sql: string, p?: unknown[]) => {
      if (sql.includes("delete from collector_runs")) {
        e.calls.push({ sql, params: p });
        throw new Error("boom");
      }
      return q(sql, p);
    });
    expect(await run(args("quick"), e.deps)).toBe(0);
    const order = e.calls.map((c) => c.sql);
    const del = order.findIndex((q) => q.includes("delete from collector_runs"));
    expect(del).toBeGreaterThan(order.findIndex((q) => q.includes("pg_try_advisory_lock")));
    expect(del).toBeLessThan(order.findIndex((q) => q.includes("insert into collector_runs")));
    expect(order[del]).toContain("interval '90 days'");
    expect(order[del]).toContain("status <> 'running'");
    expect(order.some((q) => /delete from collected_notices/.test(q))).toBe(false);
    expect(e.finish()?.status).toBe("success");
  });

  it("refuses to start when config (incl. PGPORT) is missing, touching nothing", async () => {
    const e = makeEnv({});
    delete e.deps.env.PGPORT;
    expect(await run(args("quick"), e.deps)).toBe(1);
    expect(e.logs.join()).toContain("PGPORT");
    expect(e.db.query).not.toHaveBeenCalled();
    expect(e.requests).toHaveLength(0);
  });

  it("dry-run: robots + list page 1 only, nothing stored or sent, no DB connection", async () => {
    const e = makeEnv({ site: () => new Response(fixture("board-list-page1.html"), { status: 200 }) });
    const connect = vi.fn(e.deps.connect);
    expect(await run(args("quick", { dryRun: true }), { ...e.deps, connect })).toBe(0);
    expect(connect).not.toHaveBeenCalled();
    expect(e.requests).toHaveLength(2);
    expect(e.logs[0]).toContain("items=10");
  });

  describe("collection", () => {
    it("quick: new post -> detail fetched, stored, counted; existing post skipped; 2s between requests", async () => {
      const e = makeEnv(
        { site: (u) => new Response(u.includes("selectBbsNttList") ? listHtml(ROW(2), ROW(1)) : detailHtml(), { status: 200 }) },
        { existing: { [urlFor(1)]: "h" } },
      );
      expect(await run(args("quick"), e.deps)).toBe(0);
      const urls = e.siteReqs().map((r) => r.url);
      expect(urls.filter((u) => u.includes("selectBbsNttList"))).toHaveLength(1);
      expect(urls).toContain(urlFor(2));
      expect(urls).not.toContain(urlFor(1));
      expect(e.find("insert into collected_notices")).toHaveLength(1);
      expect(e.find("insert into collected_notices")[0].params![8]).toContain("p-table__content"); // raw_html
      expect(e.sleeps).toEqual([2000, 2000]); // robots 다음 모든 요청(목록, 상세) 앞
      expect(e.finish()).toEqual({ status: "success", summary: null });
      expect(e.find("update collector_runs set finished_at")[0].params!.slice(3)).toEqual([1, 2, 1, 0, 0, 0]);
    });

    it("full: list pages 1-2, details for every row including known ones", async () => {
      const e = makeEnv(
        { site: (u) => new Response(u.includes("pageIndex=1") ? listHtml(ROW(1)) : u.includes("pageIndex=2") ? listHtml(ROW(2)) : detailHtml(), { status: 200 }) },
        { existing: { [urlFor(1)]: "h" } },
      );
      await run(args("full"), e.deps);
      const urls = e.siteReqs().map((r) => r.url);
      expect(urls.filter((u) => u.includes("selectBbsNttList")).map((u) => /pageIndex=(\d+)/.exec(u)![1])).toEqual(["1", "2"]);
      expect(urls).toContain(urlFor(1));
      expect(urls).toContain(urlFor(2));
    });

    it("backfill: whole range without a 5-page limit; a later empty page is a normal end", async () => {
      const e = makeEnv({
        site: (u) => {
          const p = /pageIndex=(\d+)/.exec(u)?.[1];
          if (p) return new Response(Number(p) <= 7 ? listHtml(ROW(Number(p))) : listHtml(), { status: 200 });
          return new Response(detailHtml(), { status: 200 });
        },
      });
      expect(await run(args("backfill", { from: 1, to: 47 }), e.deps)).toBe(0);
      expect(e.siteReqs().filter((r) => r.url.includes("selectBbsNttList"))).toHaveLength(8); // 1~7 + 빈 8페이지에서 중단
      expect(e.find("insert into collected_notices")).toHaveLength(7);
      expect(e.finish()?.status).toBe("success");
    });

    it("ip_blocked on the list: stops at once, stores nothing, run failed, full reports it", async () => {
      const e = makeEnv({ site: () => new Response(fixture("blocked-page.html"), { status: 200 }) });
      expect(await run(args("full"), e.deps)).toBe(1);
      expect(e.siteReqs()).toHaveLength(2); // robots + 차단된 목록 1건, 그 뒤 요청 없음
      expect(e.find("insert into collected_notices")).toHaveLength(0);
      expect(e.finish()).toEqual({ status: "failed", summary: "ip_blocked" });
      expect(e.ingestReqs().map((r) => r.body)).toEqual([{ kind: "full", items: [], report: { status: "failed", error_code: "ip_blocked" } }]);
    });

    it("ip_blocked on a detail page also stops the run", async () => {
      const e = makeEnv({ site: (u) => new Response(u.includes("selectBbsNttList") ? listHtml(ROW(1), ROW(2)) : fixture("blocked-page.html"), { status: 200 }) });
      await run(args("quick"), e.deps);
      expect(e.siteReqs().filter((r) => r.url.includes("selectBbsNttView"))).toHaveLength(1);
      expect(e.finish()?.summary).toBe("ip_blocked");
      expect(e.find("insert into collected_notices")).toHaveLength(0);
    });

    it("recent ip_blocked: no site request at all, but the queue is still sent; run recorded as ip_blocked_skipped", async () => {
      const e = makeEnv({ ingest: () => json(200, okResults(1)) }, { recentBlock: true, batches: [[pending(5)]] });
      expect(await run(args("quick"), e.deps)).toBe(1);
      expect(e.siteReqs()).toHaveLength(0);
      expect(e.ingestReqs()).toHaveLength(1);
      expect(e.finish()).toEqual({ status: "failed", summary: "ip_blocked_skipped" });
    });

    it("empty first list page -> empty_list (failed); a page-1 empty list is never a success", async () => {
      const e = makeEnv({ site: () => new Response(listHtml(), { status: 200 }) });
      expect(await run(args("quick"), e.deps)).toBe(1);
      expect(e.finish()).toEqual({ status: "failed", summary: "empty_list" });
    });

    it("detail without a body cell: that item is skipped, the rest are stored, run ends parse_failed", async () => {
      const e = makeEnv({
        site: (u) => new Response(u.includes("selectBbsNttList") ? listHtml(ROW(1), ROW(2)) : u.endsWith("nttNo=1") ? "<html></html>" : detailHtml(), { status: 200 }),
      });
      expect(await run(args("quick"), e.deps)).toBe(1);
      expect(e.find("insert into collected_notices")).toHaveLength(1);
      expect(e.find("insert into collected_notices")[0].params![0]).toBe(urlFor(2));
      expect(e.finish()).toEqual({ status: "failed", summary: "parse_failed" });
    });

    it("HTTP error -> fetch_failed; robots Disallow -> robots_disallowed with no board request", async () => {
      let e = makeEnv({ site: () => new Response("err", { status: 503 }) });
      await run(args("quick"), e.deps);
      expect(e.finish()?.summary).toBe("fetch_failed");

      e = makeEnv({});
      const base = e.deps.fetch;
      e.deps.fetch = (async (u: any, i: any) =>
        String(u).includes("robots.txt") ? new Response("User-agent: *\nDisallow: /youth/selectBbsNttList.do\n") : base(u, i)) as typeof fetch;
      await run(args("quick"), e.deps);
      expect(e.finish()?.summary).toBe("robots_disallowed");
      expect(e.siteReqs()).toHaveLength(0);
    });

    it("a board DB write error is recorded on the board only and not reported to Vercel", async () => {
      const e = makeEnv({ site: (u) => new Response(u.includes("selectBbsNttList") ? listHtml(ROW(1)) : detailHtml(), { status: 200 }) });
      const q = e.db.query.getMockImplementation()!;
      e.db.query.mockImplementation(async (sql: string, p?: unknown[]) => {
        if (sql.includes("insert into collected_notices")) throw new Error("db down");
        return q(sql, p);
      });
      expect(await run(args("full"), e.deps)).toBe(1);
      expect(e.finish()).toEqual({ status: "failed", summary: "unexpected" });
      expect(e.ingestReqs().filter((r) => r.body?.report)).toHaveLength(0);
    });

    it("stored values: unchanged re-collect keeps sync_status via the is-distinct-from upsert", async () => {
      const e = makeEnv({ site: (u) => new Response(u.includes("selectBbsNttList") ? listHtml(ROW(1)) : detailHtml(), { status: 200 }) }, { existing: { [urlFor(1)]: "old" } });
      await run(args("full"), e.deps);
      const sql = e.find("insert into collected_notices")[0].sql;
      expect(sql).toContain("is distinct from");
      expect(sql).toContain("then 'pending' else c.sync_status end");
      expect(e.find("update collector_runs set finished_at")[0].params!.slice(5, 7)).toEqual([0, 1]); // new 0, changed 1
    });
  });

  describe("transmission: response table", () => {
    const sendOne = (net: Net, over: Partial<Args> = {}) => {
      const e = makeEnv(net, { batches: [[pending(1), pending(2)]] });
      return run(args("sync", over), e.deps).then((code) => ({ code, e }));
    };

    it("created/updated/unchanged -> synced; rejected -> failed with code; error -> retry", async () => {
      const { code, e } = await sendOne({ ingest: () => json(200, { results: [{ result: "unchanged" }, { result: "rejected", code: "HASH_MISMATCH" }], collected_count: 0, remaining_unembedded: 0 }) });
      expect(code).toBe(0);
      expect(e.find("sync_status = 'synced'")[0].params).toEqual([["1"]]);
      expect(e.find("sync_status = 'failed', last_error")[0].params).toEqual(["2", "HASH_MISMATCH"]);
      const e2 = makeEnv({ ingest: () => json(200, { results: [{ result: "created" }, { result: "error", code: "DB_ERROR" }], remaining_unembedded: 0 }) }, { batches: [[pending(1), pending(2)]] });
      await run(args("sync"), e2.deps);
      expect(e2.find("retry_count = retry_count + 1")[0].params).toEqual(["2", "DB_ERROR", 5]);
    });

    it("200 items per request are capped at 20 and carry the secret only in the header", async () => {
      const e = makeEnv({ ingest: () => json(200, okResults(1)) }, { batches: [[pending(1)]] });
      await run(args("sync"), e.deps);
      const r = e.ingestReqs()[0];
      expect(r.url).toBe(`${INGEST}/api/ingest/notices`);
      expect(r.headers!["x-collector-secret"]).toBe(SECRET);
      expect(r.body.items[0]).not.toHaveProperty("id");
      expect(r.body.items[0]).not.toHaveProperty("raw_html");
      expect(JSON.stringify(r.body)).not.toContain(SECRET);
      expect(e.find("limit $1")[0].params).toEqual([20]);
    });

    it("network error and 5xx: every item in the batch gets retry_count+1, transmission stops", async () => {
      const a = makeEnv({ ingest: () => Promise.reject(new Error("timeout")) }, { batches: [[pending(1), pending(2)], [pending(3)]] });
      expect(await run(args("sync"), a.deps)).toBe(1);
      expect(a.find("retry_count = retry_count + 1")).toHaveLength(2);
      expect(a.ingestReqs()).toHaveLength(1);
      expect(a.finish()?.summary).toBe("ingest_unavailable");
      const b = makeEnv({ ingest: () => json(502, {}) }, { batches: [[pending(1)]] });
      await run(args("sync"), b.deps);
      expect(b.find("retry_count = retry_count + 1")).toHaveLength(1);
    });

    it("401: item state and retry_count untouched, run failed ingest_auth", async () => {
      const { code, e } = await sendOne({ ingest: () => new Response(null, { status: 401 }) });
      expect(code).toBe(1);
      expect(e.find("update collected_notices")).toHaveLength(0);
      expect(e.finish()).toEqual({ status: "failed", summary: "ingest_auth" });
    });

    it("400 and 413: item state untouched, run failed ingest_bad_request", async () => {
      for (const status of [400, 413]) {
        const { e } = await sendOne({ ingest: () => json(status, { error: "x" }) });
        expect(e.find("update collected_notices")).toHaveLength(0);
        expect(e.finish()).toEqual({ status: "failed", summary: "ingest_bad_request" });
      }
    });

    it("a malformed 200 (wrong results length) is retried, not marked synced", async () => {
      const { e } = await sendOne({ ingest: () => json(200, { results: [{ result: "created" }] }) });
      expect(e.find("sync_status = 'synced'")).toHaveLength(0);
      expect(e.find("retry_count = retry_count + 1")).toHaveLength(2);
    });

    it("a null or non-object result item retries only that item; the batch is not resent forever", async () => {
      const { code, e } = await sendOne({ ingest: () => json(200, { results: [null, { result: "created", code: 5 }], remaining_unembedded: 0 }) });
      expect(code).toBe(0);
      expect(e.find("retry_count = retry_count + 1")[0].params).toEqual(["1", "bad_item", 5]);
      expect(e.find("sync_status = 'synced'")[0].params).toEqual([["2"]]);
    });

    it("quick/full stop after 30 batches; sync has no limit", async () => {
      const many = Array.from({ length: 35 }, (_, i) => [pending(i + 1)]);
      const q = makeEnv({ site: () => new Response(listHtml(ROW(1)), { status: 200 }), ingest: () => json(200, okResults(1)) }, { batches: many, existing: { [urlFor(1)]: "h" } });
      await run(args("quick"), q.deps);
      expect(q.ingestReqs()).toHaveLength(30);
      const s = makeEnv({ ingest: () => json(200, okResults(1)) }, { batches: many });
      await run(args("sync"), s.deps);
      expect(s.ingestReqs()).toHaveLength(35);
    });

    it("--no-sync collects but sends nothing", async () => {
      const e = makeEnv({ site: (u) => new Response(u.includes("selectBbsNttList") ? listHtml(ROW(1)) : detailHtml(), { status: 200 }) }, { batches: [[pending(1)]] });
      await run(args("quick", { noSync: true }), e.deps);
      expect(e.ingestReqs()).toHaveLength(0);
      expect(e.find("insert into collected_notices")).toHaveLength(1);
    });
  });

  describe("reporting rules", () => {
    const blocked = () => new Response(fixture("blocked-page.html"), { status: 200 });
    it("quick: reports when the previous run was not a failure, stays silent while failures continue", async () => {
      const first = makeEnv({ site: blocked }, { prev: { status: "success", error_summary: null } });
      await run(args("quick"), first.deps);
      expect(first.ingestReqs()).toHaveLength(1);
      const none = makeEnv({ site: blocked }, { prev: null });
      await run(args("quick"), none.deps);
      expect(none.ingestReqs()).toHaveLength(1);
      const again = makeEnv({ site: blocked }, { prev: { status: "failed", error_summary: "ip_blocked" } });
      await run(args("quick"), again.deps);
      expect(again.ingestReqs()).toHaveLength(0);
    });

    it("full: a successful run reports success once (items empty); quick success reports nothing", async () => {
      const site = (u: string) => new Response(u.includes("selectBbsNttList") ? listHtml(ROW(1)) : detailHtml(), { status: 200 });
      const full = makeEnv({ site });
      expect(await run(args("full"), full.deps)).toBe(0);
      expect(full.ingestReqs().map((r) => r.body)).toEqual([{ kind: "full", items: [], report: { status: "success" } }]);
      const quick = makeEnv({ site }, { existing: { [urlFor(1)]: "h" } });
      expect(await run(args("quick"), quick.deps)).toBe(0);
      expect(quick.ingestReqs()).toHaveLength(0);
    });

    it("full: failures that are not Vercel-report codes send no report at all (no success either)", async () => {
      const e = makeEnv({ site: (u) => new Response(u.includes("selectBbsNttList") ? listHtml(ROW(1)) : detailHtml(), { status: 200 }) });
      e.db.query.mockImplementation(async (sql: string) => {
        if (sql.includes("insert into collected_notices")) throw new Error("db down");
        if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
        if (sql.includes("insert into collector_runs")) return { rows: [{ id: 7 }] };
        return { rows: [] };
      });
      expect(await run(args("full"), e.deps)).toBe(1);
      expect(e.ingestReqs().filter((r) => r.body?.report)).toHaveLength(0);
    });

    it("a healthy quick with no new posts makes no ingest call at all", async () => {
      const e = makeEnv({ site: () => new Response(listHtml(ROW(1)), { status: 200 }) }, { existing: { [urlFor(1)]: "h" } });
      expect(await run(args("quick"), e.deps)).toBe(0);
      expect(e.ingestReqs()).toHaveLength(0);
    });

    it("report delivery failure does not change the run result", async () => {
      const e = makeEnv({ site: blocked, ingest: () => Promise.reject(new Error("down")) });
      await run(args("full"), e.deps);
      expect(e.finish()?.summary).toBe("ip_blocked");
    });
  });

  describe("remaining embeddings", () => {
    it("calls /api/jobs/embed while remaining_unembedded > 0, at most 10 times", async () => {
      const e = makeEnv(
        {
          ingest: (p) => (p === "/api/jobs/embed" ? json(200, { processed_notices: 15, embedded_chunks: 15 }) : json(200, { results: [{ result: "created" }], remaining_unembedded: 99 })),
        },
        { batches: [[pending(1)]] },
      );
      await run(args("sync"), e.deps);
      expect(e.ingestReqs().filter((r) => r.url.endsWith("/api/jobs/embed"))).toHaveLength(10);
    });

    it("stops when embedded_chunks is 0; an embed failure does not fail the run", async () => {
      const e = makeEnv(
        { ingest: (p) => (p === "/api/jobs/embed" ? json(200, { processed_notices: 0, embedded_chunks: 0 }) : json(200, { results: [{ result: "created" }], remaining_unembedded: 3 })) },
        { batches: [[pending(1)]] },
      );
      expect(await run(args("sync"), e.deps)).toBe(0);
      expect(e.ingestReqs().filter((r) => r.url.endsWith("/api/jobs/embed"))).toHaveLength(1);
      const f = makeEnv(
        { ingest: (p) => (p === "/api/jobs/embed" ? Promise.reject(new Error("x")) : json(200, { results: [{ result: "created" }], remaining_unembedded: 3 })) },
        { batches: [[pending(1)]] },
      );
      expect(await run(args("sync"), f.deps)).toBe(0);
    });

    it("does not call it when nothing remains", async () => {
      const e = makeEnv({ ingest: () => json(200, okResults(1)) }, { batches: [[pending(1)]] });
      await run(args("sync"), e.deps);
      expect(e.ingestReqs().filter((r) => r.url.endsWith("/api/jobs/embed"))).toHaveLength(0);
    });
  });

  it("logs contain neither the key nor note bodies", async () => {
    const e = makeEnv({ ingest: () => json(200, okResults(1)) }, { batches: [[pending(1)]] });
    await run(args("sync"), e.deps);
    expect(e.logs.join("\n")).not.toContain(SECRET);
    expect(e.logs.join("\n")).not.toContain("비밀본문");
  });

  it("the lock is released and the connection closed even when the run fails", async () => {
    const e = makeEnv({ site: () => new Response("err", { status: 500 }) });
    await run(args("quick"), e.deps);
    expect(e.find("pg_advisory_unlock")).toHaveLength(1);
    expect(e.db.end).toHaveBeenCalled();
  });
});

describe("bundle", () => {
  it("builds one .mjs file and runs --dry-run against fixed HTML (10 items)", () => {
    const cwd = path.resolve(__dirname, "..");
    execFileSync("node", ["scripts/build-collector.mjs"], { cwd });
    const out = execFileSync(
      "node",
      ["--import", pathToFileURL(path.join(__dirname, "fixtures", "stub-fetch.mjs")).href, "dist-collector/anyang-collector.mjs", "quick", "--dry-run"],
      { cwd, encoding: "utf-8" },
    );
    expect(out).toContain("dry-run: ok requests=2 items=10");
  }, 30_000);
});
