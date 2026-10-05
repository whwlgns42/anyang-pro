import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { GET } = await import("@/app/api/notices/recommended/route");

function makeRequest(query = "") {
  return new Request(`http://localhost/api/notices/recommended${query}`) as unknown as Parameters<
    typeof GET
  >[0];
}

function mockAuthOk() {
  authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
}

describe("GET /api/notices/recommended", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
  });

  it("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("falls back to latest notices when the user has no preferences", async () => {
    mockAuthOk();
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select embedding from user_preferences")) return { rows: [] };
      if (sql.includes("order by is_pinned desc, published_at desc nulls last, id desc")) {
        return {
          rows: [
            {
              id: "n1",
              title: "제목1",
              body: "본문 내용".repeat(20),
              published_at: new Date("2026-01-01"),
              is_pinned: true,
              image_count: 2,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      {
        id: "n1",
        title: "제목1",
        excerpt: "본문 내용".repeat(20).slice(0, 100),
        posted_at: "2026-01-01T00:00:00.000Z",
        is_pinned: true,
        image_count: 2,
      },
    ]);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("uses similarity search when preferences exist", async () => {
    mockAuthOk();
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select embedding from user_preferences")) {
        return { rows: [{ embedding: JSON.stringify([0.1, 0.2]) }] };
      }
      if (sql.includes("distinct on (n.id)")) {
        return { rows: [{ id: "n2", title: "매칭 공지", body: "매칭 본문", published_at: null, is_pinned: false, image_count: 0 }] };
      }
      return { rows: [] };
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: "n2", title: "매칭 공지", excerpt: "매칭 본문", posted_at: null, is_pinned: false, image_count: 0 },
    ]);
    expect(res.headers.get("cache-control")).toBe("no-store");
    // 추천 경로는 유사도 순서를 유지한다(고정 공지를 위로 올리지 않는다).
    const sql = String(queryMock.mock.calls.find(([s]) => String(s).includes("distinct on"))?.[0]);
    expect(sql).toContain("order by grp asc, distance asc");
    expect(sql).not.toContain("is_pinned desc");
    // 2-1-1절(확인 항목 63) - 임베딩 전 최근 공지를 맨 위에 합친다.
    expect(sql).toContain("not exists (select 1 from notice_chunks");
    expect(sql).toContain("hidden_at is null");
    expect(sql).toContain("union all");
    const params = queryMock.mock.calls.find(([s]) => String(s).includes("distinct on"))?.[1] as unknown[];
    expect(params.slice(1)).toEqual([20, 0, 7]);
  });
});
