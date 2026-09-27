import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { parseRobotsTxt, isPathDisallowed } from "@/lib/robots";

const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));

const { parseListPage, parseDetailPage, contentHash, runCollectJob } = await import("@/lib/collector");

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

describe("board HTML parsing (실제 게시판 구조 기준 픽스처, 2026-09-28 확인)", () => {
  it("parses list page rows into items with canonical detail URL and list-page date", () => {
    const html = `
      <table class="p-table"><tbody>
        <tr>
          <td>123</td>
          <td class="p-subject"><a href="./selectBbsNttView.do?key=3543&amp;bbsNo=1184&amp;nttNo=456&amp;pageIndex=1">청년 지원 사업 안내</a></td>
          <td><i class="ico-attach"></i></td>
          <td>10</td>
          <td><time>2026-09-01</time></td>
        </tr>
      </tbody></table>`;
    const items = parseListPage(html);
    expect(items).toEqual([
      {
        url: "https://www.anyang.go.kr/youth/selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=456",
        title: "청년 지원 사업 안내",
        publishedAt: "2026-09-01",
      },
    ]);
  });

  it("parses detail page into title/body (no date on detail page)", () => {
    const html = `
      <table><tbody>
        <tr><th>제목</th><td><span class="p-table__subject_text">청년 지원 사업 안내</span></td></tr>
        <tr><th>내용</th><td class="p-table__content">본문 내용입니다.</td></tr>
        <tr><th>첨부파일</th><td>
          <ul class="p-attach"><li><a class="p-attach__link" href="/download/1.hwp">첨부파일.hwp</a></li></ul>
        </td></tr>
      </tbody></table>`;
    const detail = parseDetailPage(html);
    expect(detail).toEqual({
      title: "청년 지원 사업 안내",
      body: "본문 내용입니다.",
    });
  });

  it("hashes title+body deterministically", () => {
    expect(contentHash("t", "b")).toBe(contentHash("t", "b"));
    expect(contentHash("t", "b")).not.toBe(contentHash("t", "c"));
  });
});

describe("runCollectJob", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("skips collection and records failure when robots.txt disallows the board path", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("insert into collect_runs")) return { rows: [{ id: "run-1" }] };
      return { rows: [] };
    });
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("robots.txt")) {
        return new Response("User-agent: *\nDisallow: /youth/selectBbsNttList.do\n", { status: 200 });
      }
      throw new Error("should not fetch board when disallowed");
    });

    const result = await runCollectJob("scheduled", null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ROBOTS_DISALLOWED");

    const updateCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("update collect_runs"));
    expect(updateCall?.[1]).toEqual(["run-1", "robots.txt disallow"]);
  });

  it("skips notices whose content_hash already exists (no duplicate insert)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("insert into collect_runs")) return { rows: [{ id: "run-1" }] };
      if (text.includes("select id from notices where content_hash")) return { rows: [{ id: "existing" }] };
      return { rows: [] };
    });
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("robots.txt")) {
        return new Response("User-agent: *\nCrawl-delay: 0\n", { status: 200 });
      }
      if (String(url).includes("selectBbsNttList")) {
        return new Response(
          '<table class="p-table"><tbody><tr><td>1</td>' +
            '<td class="p-subject"><a href="./selectBbsNttView.do?key=3543&amp;bbsNo=1184&amp;nttNo=1">공지</a></td>' +
            '<td></td><td>0</td><td><time>2026-09-01</time></td></tr></tbody></table>',
          { status: 200 },
        );
      }
      return new Response(
        '<table><tbody><tr><td><span class="p-table__subject_text">공지</span></td></tr><tr><td class="p-table__content">본문</td></tr></tbody></table>',
        { status: 200 },
      );
    });

    const result = await runCollectJob("scheduled", null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.collectedCount).toBe(0);

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into notices"));
    expect(insertCall).toBeUndefined();
  });

  it("deletes existing notice_chunks when a known source_url's content changes (re-embed queue)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("insert into collect_runs")) return { rows: [{ id: "run-1" }] };
      if (text.includes("select id from notices where content_hash")) return { rows: [] }; // hash changed
      if (text.includes("select id from notices where source_url")) return { rows: [{ id: "existing-notice" }] };
      return { rows: [] };
    });
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("robots.txt")) return new Response("Not Found", { status: 404 });
      if (String(url).includes("selectBbsNttList")) {
        return new Response(
          '<table class="p-table"><tbody><tr><td>1</td>' +
            '<td class="p-subject"><a href="./selectBbsNttView.do?key=3543&amp;bbsNo=1184&amp;nttNo=1">공지</a></td>' +
            '<td></td><td>0</td><td><time>2026-09-01</time></td></tr></tbody></table>',
          { status: 200 },
        );
      }
      return new Response(
        '<table><tbody><tr><td><span class="p-table__subject_text">공지</span></td></tr><tr><td class="p-table__content">수정된 본문</td></tr></tbody></table>',
        { status: 200 },
      );
    });

    const result = await runCollectJob("scheduled", null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.collectedCount).toBe(1);

    const deleteCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("delete from notice_chunks"));
    expect(deleteCall?.[1]).toEqual(["existing-notice"]);
  });

  it("does not delete notice_chunks for a brand-new source_url", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("insert into collect_runs")) return { rows: [{ id: "run-1" }] };
      if (text.includes("select id from notices where content_hash")) return { rows: [] };
      if (text.includes("select id from notices where source_url")) return { rows: [] }; // new notice
      return { rows: [] };
    });
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("robots.txt")) return new Response("Not Found", { status: 404 });
      if (String(url).includes("selectBbsNttList")) {
        return new Response(
          '<table class="p-table"><tbody><tr><td>1</td>' +
            '<td class="p-subject"><a href="./selectBbsNttView.do?key=3543&amp;bbsNo=1184&amp;nttNo=1">공지</a></td>' +
            '<td></td><td>0</td><td><time>2026-09-01</time></td></tr></tbody></table>',
          { status: 200 },
        );
      }
      return new Response(
        '<table><tbody><tr><td><span class="p-table__subject_text">공지</span></td></tr><tr><td class="p-table__content">본문</td></tr></tbody></table>',
        { status: 200 },
      );
    });

    const result = await runCollectJob("scheduled", null);
    expect(result.ok).toBe(true);

    const deleteCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("delete from notice_chunks"));
    expect(deleteCall).toBeUndefined();
  });

  it("treats a 404 robots.txt as no restrictions (proceeds to collect)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("insert into collect_runs")) return { rows: [{ id: "run-1" }] };
      if (text.includes("select id from notices where content_hash")) return { rows: [] };
      return { rows: [] };
    });
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("robots.txt")) {
        return new Response("Not Found", { status: 404 });
      }
      if (String(url).includes("selectBbsNttList")) {
        return new Response(
          '<table class="p-table"><tbody><tr><td>1</td>' +
            '<td class="p-subject"><a href="./selectBbsNttView.do?key=3543&amp;bbsNo=1184&amp;nttNo=1">공지</a></td>' +
            '<td></td><td>0</td><td><time>2026-09-01</time></td></tr></tbody></table>',
          { status: 200 },
        );
      }
      return new Response(
        '<table><tbody><tr><td><span class="p-table__subject_text">공지</span></td></tr><tr><td class="p-table__content">본문</td></tr></tbody></table>',
        { status: 200 },
      );
    });

    const result = await runCollectJob("scheduled", null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.collectedCount).toBe(1);
  });
});
