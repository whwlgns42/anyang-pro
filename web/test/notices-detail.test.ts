import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { GET } = await import("@/app/api/notices/[id]/route");

function makeRequest() {
  return new Request("http://localhost/api/notices/n1") as unknown as Parameters<typeof GET>[0];
}

describe("GET /api/notices/:id", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
  });

  it("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "n1" }) });
    expect(res.status).toBe(401);
  });

  it("404 when notice is hidden or missing", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("from notices")) return { rows: [] };
      return { rows: [] };
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "n1" }) });
    expect(res.status).toBe(404);
  });

  it("returns notice detail fields", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("from notices")) {
        return {
          rows: [
            {
              id: "n1",
              title: "제목",
              body: "본문",
              source_url: "https://example.com/1",
              published_at: new Date("2026-01-02"),
              attachments: [{ name: "a.hwp", url: "https://www.anyang.go.kr/youth/downloadBbsFile.do?atchmnflNo=1" }],
              image_count: 3,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "n1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "n1",
      title: "제목",
      body: "본문",
      source_url: "https://example.com/1",
      posted_at: "2026-01-02T00:00:00.000Z",
      attachments: [{ name: "a.hwp", url: "https://www.anyang.go.kr/youth/downloadBbsFile.do?atchmnflNo=1" }],
      image_count: 3,
    });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
