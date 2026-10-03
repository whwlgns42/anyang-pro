import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseRobotsTxt, isPathDisallowed } from "@/lib/robots";
import { makePoolMock } from "./helpers";

const poolMock = makePoolMock();
vi.mock("@/lib/db", () => ({
  pool: {
    query: (...args: unknown[]) => poolMock.query(...args),
    connect: () => poolMock.connect(),
  },
}));

const { parseListPage, parseDetailPage, contentHash, runCollectJob } = await import("@/lib/collector");
const parser = await import("@/lib/notice-parser");

// 실제 게시판(2026-10-04 수집)에서 표 부분만 잘라 저장한 픽스처.
const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf-8");

describe("robots.txt parsing", () => {
  it("collects Disallow entries for the wildcard user-agent group", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /admin\nDisallow: /youth/selectBbsNttList.do\n");
    expect(isPathDisallowed(rules, "/youth/selectBbsNttList.do")).toBe(true);
    expect(isPathDisallowed(rules, "/other")).toBe(false);
  });

  it("ignores Disallow entries under a non-wildcard group", () => {
    const rules = parseRobotsTxt("User-agent: SomeBot\nDisallow: /youth\n\nUser-agent: *\nDisallow: /admin\n");
    expect(isPathDisallowed(rules, "/youth/selectBbsNttList.do")).toBe(false);
  });

  it("reads Crawl-delay", () => {
    const rules = parseRobotsTxt("User-agent: *\nCrawl-delay: 5\n");
    expect(rules.crawlDelaySeconds).toBe(5);
  });

  it("defaults crawlDelaySeconds to null when absent", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /admin\n");
    expect(rules.crawlDelaySeconds).toBeNull();
  });
});

describe("parseListPage", () => {
  it("parses a real list page: 10 rows, canonical URL, date, not pinned", () => {
    const items = parseListPage(fixture("board-list-page1.html"));
    expect(items).toHaveLength(10);
    expect(items[0]).toEqual({
      url: "https://www.anyang.go.kr/youth/selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=459084",
      title: "2026년 안양 청년 역량강화 특강 PART.1 <래빗해빛>",
      publishedAt: "2026-10-01",
      isPinned: false,
    });
    expect(items.every((i) => i.isPinned === false)).toBe(true);
  });

  // 합성 픽스처: 실측한 1~2페이지에는 고정 행이 없어 사이트 CSS의 `.p-table .p-notice`를 근거로 만든 행이다.
  it("marks tr.p-notice rows as pinned and keeps only the first of a duplicated nttNo", () => {
    const row = (cls: string, ntt: string, title: string) =>
      `<tr${cls}><td>x</td><td class="p-subject"><a href="./selectBbsNttView.do?key=3543&amp;bbsNo=1184&amp;nttNo=${ntt}">${title}</a></td><td></td><td>1</td><td><time>2026-01-01</time></td></tr>`;
    const html = `<table class="p-table"><tbody>${row(' class="p-notice"', "9", "고정")}${row("", "10", "일반")}${row("", "9", "고정")}</tbody></table>`;
    const items = parseListPage(html);
    expect(items.map((i) => [i.title, i.isPinned])).toEqual([
      ["고정", true],
      ["일반", false],
    ]);
  });
});

describe("parseDetailPage", () => {
  it("no attachment: empty attachments and imageCount 0", () => {
    const d = parseDetailPage(fixture("detail-no-attach.html"));
    expect(d.title).toBe("경기도 산후조리비 사업 중단에 따른 안내");
    expect(d.attachments).toEqual([]);
    expect(d.imageCount).toBe(0);
  });

  it("multiple attachments: file name only (no icon text), absolute download URLs", () => {
    const d = parseDetailPage(fixture("detail-multi-attach.html"));
    expect(d.attachments).toHaveLength(2);
    expect(d.attachments[0].url).toBe("https://www.anyang.go.kr/youth/downloadBbsFile.do?atchmnflNo=842189");
    expect(d.attachments[0].name).toMatch(/\.hwpx$/);
    expect(d.attachments[0].name).not.toMatch(/파일$/);
    expect(d.imageCount).toBe(0);
  });

  it("image attachment shown again by the site in div.p-photo counts once", () => {
    const d = parseDetailPage(fixture("detail-image-attach.html"));
    expect(d.attachments).toHaveLength(1);
    expect(d.attachments[0].name).toMatch(/\.jpg$/i);
    expect(d.imageCount).toBe(1); // 본문 p-photo <img>는 제외, 이미지 첨부 1건
  });

  it("two attachments (png + pdf) with p-photo: only the png counts", () => {
    const d = parseDetailPage(fixture("detail-photo-two-attach.html"));
    expect(d.attachments).toHaveLength(2);
    expect(d.imageCount).toBe(1);
  });

  it("excludes the ckeditor smiley <img> from imageCount, counts the jpg attachment", () => {
    const html = fixture("detail-emoji-image-attach.html");
    expect(html).toContain("/plugin/ckeditor/plugins/smiley/");
    expect(parseDetailPage(html).imageCount).toBe(1);
  });

  it("counts a real body <img> and dedupes identical attachment URLs", () => {
    const html = `<table><tr><td><span class="p-table__subject_text">t</span></td></tr>
      <tr><td class="p-table__content"><p>x</p><img src="/DATA/bbs/1184/a.png"></td></tr>
      <tr><td><ul class="p-attach">
        <li><a class="p-attach__link" href="./downloadBbsFile.do?atchmnflNo=1"><span class="p-icon">pdf</span><span>a.PDF</span></a></li>
        <li><a class="p-attach__link" href="./downloadBbsFile.do?atchmnflNo=1"><span>dup.pdf</span></a></li>
        <li><a class="p-attach__link" href="/other/link.do"><span>x.jpg</span></a></li>
      </ul></td></tr></table>`;
    const d = parseDetailPage(html);
    expect(d.attachments).toEqual([
      { name: "a.PDF", url: "https://www.anyang.go.kr/youth/downloadBbsFile.do?atchmnflNo=1" },
    ]);
    expect(d.imageCount).toBe(1);
  });

  it("hashes title+body deterministically", () => {
    expect(contentHash("t", "b")).toBe(contentHash("t", "b"));
    expect(contentHash("t", "b")).not.toBe(contentHash("t", "c"));
  });
});

const LIST_ROW = (ntt: number, cls = "") =>
  `<tr${cls}><td>1</td><td class="p-subject"><a href="./selectBbsNttView.do?key=3543&amp;bbsNo=1184&amp;nttNo=${ntt}">공지${ntt}</a></td><td></td><td>0</td><td><time>2026-09-01</time></td></tr>`;
const listHtml = (...rows: string[]) => `<table class="p-table"><tbody>${rows.join("")}</tbody></table>`;
const detailHtml = (body: string) =>
  `<table><tbody><tr><td><span class="p-table__subject_text">공지</span></td></tr><tr><td class="p-table__content">${body}</td></tr></tbody></table>`;
const urlFor = (ntt: number) =>
  `https://www.anyang.go.kr/youth/selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=${ntt}`;

type Existing = { id: string; source_url: string; content_hash: string };

// pool.query 목: existing은 `source_url = any` 조회 결과. client는 락 트랜잭션용.
function setupDb(opts: { existing?: Existing[]; locked?: boolean; runningRow?: boolean } = {}) {
  poolMock.query.mockReset();
  poolMock.client.query.mockReset();
  poolMock.client.release.mockReset();
  poolMock.query.mockImplementation(async (sql: string) => {
    if (String(sql).includes("source_url = any")) return { rows: opts.existing ?? [] };
    return { rows: [] };
  });
  poolMock.client.query.mockImplementation(async (sql: string, params?: unknown[]) => {
    const text = String(sql);
    if (text.includes("pg_try_advisory_xact_lock")) return { rows: [{ locked: opts.locked ?? true }] };
    if (text.includes("select 1 from collect_runs")) return { rows: opts.runningRow ? [{}] : [] };
    if (text.includes("insert into collect_runs")) return { rows: [{ id: "run-1" }] };
    // saveNotice의 행 잠금 조회(공지 1건 = 한 트랜잭션, client 사용)
    if (text.includes("for update")) {
      const known = (opts.existing ?? []).find((e) => e.source_url === params?.[0]);
      return { rows: known ? [known] : [] };
    }
    return { rows: [] };
  });
}

function mockFetch(pages: Record<string, string>, detail: (url: string) => string = () => detailHtml("본문")) {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => {
    const u = String(url);
    if (u.includes("robots.txt")) return new Response("User-agent: *\nCrawl-delay: 0\n", { status: 200 });
    if (u.includes("selectBbsNttList")) {
      const m = /pageIndex=(\d+)/.exec(u);
      return new Response(pages[m?.[1] ?? "1"] ?? listHtml(), { status: 200 });
    }
    return new Response(detail(u), { status: 200 });
  });
  global.fetch = fetchMock;
  return fetchMock;
}

const requested = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map(([u]) => String(u));
const sqlCalls = (needle: string) =>
  [...poolMock.query.mock.calls, ...poolMock.client.query.mock.calls].filter(([sql]) => String(sql).includes(needle));

describe("runCollectJob", () => {
  const originalFetch = global.fetch;
  const originalContact = process.env.COLLECTOR_CONTACT;

  beforeEach(() => {
    setupDb();
    delete process.env.COLLECTOR_CONTACT;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalContact === undefined) delete process.env.COLLECTOR_CONTACT;
    else process.env.COLLECTOR_CONTACT = originalContact;
  });

  it("records failure and fetches nothing else when robots.txt disallows the board path", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("robots.txt")) {
        return new Response("User-agent: *\nDisallow: /youth/selectBbsNttList.do\n", { status: 200 });
      }
      throw new Error("should not fetch board when disallowed");
    });

    const result = await runCollectJob("scheduled", null);
    expect(result).toMatchObject({ ok: false, reason: "ROBOTS_DISALLOWED" });
    expect(sqlCalls("update collect_runs")[0][1]).toEqual(["run-1", "robots.txt disallow"]);
  });

  it("quick: requests only list page 1, details only for URLs not in the DB", async () => {
    setupDb({ existing: [{ id: "e1", source_url: urlFor(1), content_hash: "h" }] });
    const f = mockFetch({ "1": listHtml(LIST_ROW(1), LIST_ROW(2)) });

    const result = await runCollectJob("scheduled", null, { mode: "quick" });
    expect(result).toEqual({ ok: true, collectedCount: 1 });
    const urls = requested(f);
    expect(urls.filter((u) => u.includes("selectBbsNttList"))).toHaveLength(1);
    expect(urls).toContain(urlFor(2));
    expect(urls).not.toContain(urlFor(1));
    expect(sqlCalls("insert into notices")).toHaveLength(1);
  });

  it("quick with no new posts: robots + list only, no insert", async () => {
    setupDb({ existing: [{ id: "e1", source_url: urlFor(1), content_hash: "h" }] });
    const f = mockFetch({ "1": listHtml(LIST_ROW(1)) });
    const result = await runCollectJob("scheduled", null, { mode: "quick" });
    expect(result).toEqual({ ok: true, collectedCount: 0 });
    expect(f).toHaveBeenCalledTimes(2);
    expect(sqlCalls("insert into notices")).toHaveLength(0);
  });

  it("full (also the default): list pages 1-2, details for every row", async () => {
    setupDb({ existing: [{ id: "e1", source_url: urlFor(1), content_hash: "h" }] });
    const f = mockFetch({ "1": listHtml(LIST_ROW(1)), "2": listHtml(LIST_ROW(2)) });
    await runCollectJob("scheduled", null);
    const urls = requested(f);
    expect(urls.filter((u) => u.includes("selectBbsNttList")).map((u) => /pageIndex=(\d+)/.exec(u)![1])).toEqual([
      "1",
      "2",
    ]);
    expect(urls).toContain(urlFor(1));
    expect(urls).toContain(urlFor(2));
  });

  it("backfill: given page range, skipExisting skips known URLs, stops at an empty page", async () => {
    setupDb({ existing: [{ id: "e1", source_url: urlFor(1), content_hash: "h" }] });
    const f = mockFetch({ "3": listHtml(LIST_ROW(1), LIST_ROW(2)), "4": listHtml() });
    const result = await runCollectJob("manual", null, {
      mode: "backfill",
      fromPage: 3,
      toPage: 9,
      skipExisting: true,
    });
    expect(result).toEqual({ ok: true, collectedCount: 1 });
    const lists = requested(f).filter((u) => u.includes("selectBbsNttList"));
    expect(lists).toHaveLength(2); // 3, 4(빈 페이지) 뒤 5~9는 요청하지 않는다
    expect(requested(f)).not.toContain(urlFor(1));
  });

  it("same body, known URL: updates only the 4 metadata columns, keeps chunks", async () => {
    const hash = contentHash("공지", "본문");
    setupDb({ existing: [{ id: "e1", source_url: urlFor(1), content_hash: hash }] });
    mockFetch({ "1": listHtml(LIST_ROW(1, ' class="p-notice"')) });

    const result = await runCollectJob("scheduled", null, { mode: "full" });
    expect(result).toEqual({ ok: true, collectedCount: 0 });
    const upd = sqlCalls("update notices");
    expect(upd).toHaveLength(1);
    expect(upd[0][1]).toEqual(["e1", true, 0, "[]", "2026-09-01"]);
    expect(sqlCalls("insert into notices")).toHaveLength(0);
    expect(sqlCalls("delete from notice_chunks")).toHaveLength(0);
  });

  it("changed body, known URL: upsert with the 3 new columns and delete chunks (re-embed)", async () => {
    setupDb({ existing: [{ id: "e1", source_url: urlFor(1), content_hash: "old" }] });
    mockFetch({ "1": listHtml(LIST_ROW(1)) }, () => detailHtml("수정된 본문"));

    const result = await runCollectJob("scheduled", null, { mode: "full" });
    expect(result).toEqual({ ok: true, collectedCount: 1 });
    const ins = sqlCalls("insert into notices")[0];
    expect(String(ins[0])).toContain("on conflict (source_url)");
    expect(ins[1].slice(5)).toEqual([false, 0, "[]"]);
    expect(sqlCalls("delete from notice_chunks")[0][1]).toEqual(["e1"]);
  });

  it("unparseable list date (null): both update and upsert keep the stored published_at via coalesce", async () => {
    const noDate = (ntt: number) => LIST_ROW(ntt).replace("<time>2026-09-01</time>", "");
    setupDb({
      existing: [
        { id: "e1", source_url: urlFor(1), content_hash: contentHash("공지", "본문") },
        { id: "e2", source_url: urlFor(2), content_hash: "old" },
      ],
    });
    mockFetch({ "1": listHtml(noDate(1), noDate(2)) });

    await runCollectJob("scheduled", null, { mode: "full" });
    const upd = sqlCalls("update notices")[0];
    expect(String(upd[0])).toContain("published_at = coalesce($5, published_at)");
    expect(upd[1][4]).toBeNull();
    const ins = sqlCalls("insert into notices")[0];
    expect(String(ins[0])).toContain("coalesce(excluded.published_at, notices.published_at)");
    expect(ins[1][4]).toBeNull();
  });

  it("new URL: inserts without deleting chunks; same body under a different URL is still saved", async () => {
    setupDb();
    mockFetch({ "1": listHtml(LIST_ROW(1), LIST_ROW(2)) }); // 두 글의 제목·본문 해시가 같다
    const result = await runCollectJob("scheduled", null, { mode: "full" });
    expect(result).toEqual({ ok: true, collectedCount: 2 });
    expect(sqlCalls("insert into notices")).toHaveLength(2);
    expect(sqlCalls("delete from notice_chunks")).toHaveLength(0);
  });

  it("returns ALREADY_RUNNING without any insert or fetch when the advisory lock is held", async () => {
    setupDb({ locked: false });
    const f = mockFetch({});
    const result = await runCollectJob("scheduled", null, { mode: "quick" });
    expect(result).toMatchObject({ ok: false, reason: "ALREADY_RUNNING" });
    expect(f).not.toHaveBeenCalled();
    expect(poolMock.client.query.mock.calls.some(([s]) => String(s).includes("insert into collect_runs"))).toBe(false);
    expect(poolMock.client.release).toHaveBeenCalled();
  });

  it("returns ALREADY_RUNNING when a fresh running row exists, and cleans stale rows first", async () => {
    setupDb({ runningRow: true });
    mockFetch({});
    const result = await runCollectJob("scheduled", null, { mode: "quick" });
    expect(result).toMatchObject({ ok: false, reason: "ALREADY_RUNNING" });
    const stale = poolMock.client.query.mock.calls.find(([s]) => String(s).includes("STALE_RUNNING"));
    expect(stale).toBeDefined();
    expect(poolMock.client.query.mock.calls.some(([s]) => String(s).includes("insert into collect_runs"))).toBe(false);
  });

  it("User-Agent carries COLLECTOR_CONTACT when set, and no contact text when unset", async () => {
    let f = mockFetch({ "1": listHtml() });
    await runCollectJob("scheduled", null, { mode: "quick" });
    expect(f.mock.calls[0][1].headers["user-agent"]).toBe("anyang-youth-policy-bot/1.0");

    process.env.COLLECTOR_CONTACT = "ops@example.invalid";
    f = mockFetch({ "1": listHtml() });
    await runCollectJob("scheduled", null, { mode: "quick" });
    expect(f.mock.calls[0][1].headers["user-agent"]).toBe(
      "anyang-youth-policy-bot/1.0 (+contact: ops@example.invalid)",
    );
  });

  it("marks the run failed when a request returns a non-2xx status", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) =>
      String(url).includes("robots.txt")
        ? new Response("User-agent: *\nCrawl-delay: 0\n", { status: 200 })
        : new Response("err", { status: 503 }),
    );
    const result = await runCollectJob("scheduled", null, { mode: "quick" });
    expect(result).toMatchObject({ ok: false, reason: "COLLECT_FAILED" });
  });

  it("blocked list page: run fails with ip_blocked, nothing saved", async () => {
    mockFetch({ "1": fixture("blocked-page.html") });
    const result = await runCollectJob("scheduled", null, { mode: "quick" });
    expect(result).toEqual({ ok: false, reason: "COLLECT_FAILED", errorSummary: "ip_blocked" });
    expect(sqlCalls("update collect_runs")[0][1]).toEqual(["run-1", "ip_blocked"]);
    expect(sqlCalls("insert into notices")).toHaveLength(0);
  });

  it("blocked detail page: run fails with ip_blocked", async () => {
    mockFetch({ "1": listHtml(LIST_ROW(1)) }, () => fixture("blocked-page.html"));
    const result = await runCollectJob("scheduled", null, { mode: "quick" });
    expect(result).toMatchObject({ ok: false, errorSummary: "ip_blocked" });
    expect(sqlCalls("insert into notices")).toHaveLength(0);
  });

  it("empty first list page: run fails with empty_list, not success", async () => {
    mockFetch({ "1": listHtml() });
    const result = await runCollectJob("scheduled", null, { mode: "full" });
    expect(result).toMatchObject({ ok: false, reason: "COLLECT_FAILED", errorSummary: "empty_list" });
  });
});

describe("notice-parser", () => {
  it("collector.ts re-exports the same functions", () => {
    expect(parseListPage).toBe(parser.parseListPage);
    expect(parseDetailPage).toBe(parser.parseDetailPage);
    expect(contentHash).toBe(parser.contentHash);
  });

  it("isBlockedPage: true for the blocked fixture, false for a real list page", () => {
    expect(parser.isBlockedPage(fixture("blocked-page.html"))).toBe(true);
    expect(parser.isBlockedPage(fixture("board-list-page1.html"))).toBe(false);
  });

  it("hasDetailContent: body cell present (even empty) vs absent", () => {
    expect(parser.hasDetailContent(detailHtml(""))).toBe(true);
    expect(parser.hasDetailContent(fixture("blocked-page.html"))).toBe(false);
  });
});
