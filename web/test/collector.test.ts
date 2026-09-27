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

describe("board HTML parsing (fixture, placeholder selectors)", () => {
  it("parses list page rows into items", () => {
    const html = `
      <table class="board-list"><tbody>
        <tr><td><a href="/youth/view.do?id=1">첫 번째 공지</a></td></tr>
        <tr><td><a href="/youth/view.do?id=2">두 번째 공지</a></td></tr>
      </tbody></table>`;
    const items = parseListPage(html);
    expect(items).toEqual([
      { url: "https://www.anyang.go.kr/youth/view.do?id=1", title: "첫 번째 공지" },
      { url: "https://www.anyang.go.kr/youth/view.do?id=2", title: "두 번째 공지" },
    ]);
  });

  it("parses detail page into title/body/publishedAt", () => {
    const html = `
      <div class="board-view-title">청년 지원 사업 안내</div>
      <div class="board-view-date">2026-09-01</div>
      <div class="board-view-content">본문 내용입니다.</div>`;
    const detail = parseDetailPage(html);
    expect(detail).toEqual({
      title: "청년 지원 사업 안내",
      body: "본문 내용입니다.",
      publishedAt: "2026-09-01",
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
          '<table class="board-list"><tbody><tr><td><a href="/youth/view.do?id=1">공지</a></td></tr></tbody></table>',
          { status: 200 },
        );
      }
      return new Response(
        '<div class="board-view-title">공지</div><div class="board-view-content">본문</div>',
        { status: 200 },
      );
    });

    const result = await runCollectJob("scheduled", null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.collectedCount).toBe(0);

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into notices"));
    expect(insertCall).toBeUndefined();
  });
});
