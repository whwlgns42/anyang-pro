import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { GET, PUT } = await import("@/app/api/profile/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PUT>[0];
}

describe("/api/profile", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
  });

  it("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("400 on invalid gender code", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      return { rows: [] };
    });

    const res = await PUT(
      makeRequest({
        birth_year: 2000,
        gender: "not-a-real-code",
        occupation_type: "it",
        enrollment_status: "student",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("upserts on valid body", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      return { rows: [] };
    });

    const res = await PUT(
      makeRequest({
        birth_year: 2000,
        gender: "male",
        occupation_type: "it",
        enrollment_status: "student",
      }),
    );
    expect(res.status).toBe(200);
  });

  // anyang-database-schema profiles 표: 모든 항목 null 허용 — "나중에 입력" 건너뛰기 지원.
  it("모든 항목이 null이어도 200으로 저장된다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      return { rows: [] };
    });

    const res = await PUT(
      makeRequest({
        birth_year: null,
        gender: null,
        occupation_type: null,
        enrollment_status: null,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      birth_year: null,
      gender: null,
      occupation_type: null,
      enrollment_status: null,
    });
  });

  it("일부 항목만 제출해도 200으로 저장된다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      return { rows: [] };
    });

    const res = await PUT(
      makeRequest({
        birth_year: 2000,
        gender: null,
        occupation_type: null,
        enrollment_status: null,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.birth_year).toBe(2000);
    expect(body.gender).toBeNull();
  });
});
