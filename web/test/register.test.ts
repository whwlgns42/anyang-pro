import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const clientQuery = vi.fn();
const client = { query: clientQuery, release: vi.fn() };
const connectMock = vi.fn(async () => client);
const poolQueryMock = vi.fn();

// 기본값: 가입 시도 제한(auth_attempts)에 걸리지 않은 상태(count 0) + insert 성공.
vi.mock("@/lib/db", () => ({
  pool: { connect: () => connectMock(), query: (...args: unknown[]) => poolQueryMock(...args) },
}));

const { POST } = await import("@/app/api/auth/register/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/auth/register", () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    clientQuery.mockReset();
    connectMock.mockClear();
    poolQueryMock.mockReset();
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("select count(*)")) return { rows: [{ count: "0" }] };
      return { rows: [] };
    });
    process.env.ADMIN_EMAILS = "admin@anyang.go.kr";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it("400 when a consent item is missing", async () => {
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        password: "password123",
        consents: { collection_use: true },
      }),
    );
    expect(res.status).toBe(400);
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("403 ADMIN_EMAIL_RESERVED for ADMIN_EMAILS entries", async () => {
    const res = await POST(
      makeRequest({
        email: "Admin@Anyang.go.kr",
        password: "password123",
        consents: { collection_use: true, overseas_transfer: true },
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("ADMIN_EMAIL_RESERVED");
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("creates user + credentials + 2 consent rows on success", async () => {
    clientQuery
      .mockResolvedValueOnce(undefined) // begin
      .mockResolvedValueOnce({ rows: [] }) // existing check
      .mockResolvedValueOnce({ rows: [{ id: "user-1" }] }) // insert users
      .mockResolvedValueOnce(undefined) // insert credentials
      .mockResolvedValueOnce(undefined) // insert consent 1
      .mockResolvedValueOnce(undefined) // insert consent 2
      .mockResolvedValueOnce(undefined); // commit

    const res = await POST(
      makeRequest({
        email: "user@example.com",
        password: "password123",
        consents: { collection_use: true, overseas_transfer: true },
      }),
    );

    expect(res.status).toBe(201);
    const consentInserts = clientQuery.mock.calls.filter(([sql]) =>
      String(sql).includes("insert into consents"),
    );
    expect(consentInserts).toHaveLength(2);
  });

  it("409 when email already taken", async () => {
    clientQuery
      .mockResolvedValueOnce(undefined) // begin
      .mockResolvedValueOnce({ rows: [{ id: "existing" }] }) // existing check
      .mockResolvedValueOnce(undefined); // rollback

    const res = await POST(
      makeRequest({
        email: "user@example.com",
        password: "password123",
        consents: { collection_use: true, overseas_transfer: true },
      }),
    );
    expect(res.status).toBe(409);
  });

  // anyang-backend-api 1-6절(확인 항목 29) — 비밀번호 최소 8자.
  it("400 PASSWORD_TOO_SHORT when password is under 8 characters", async () => {
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        password: "pw1234",
        consents: { collection_use: true, overseas_transfer: true },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("PASSWORD_TOO_SHORT");
    expect(connectMock).not.toHaveBeenCalled();
  });

  // anyang-backend-api 1-6절 — 가입 시도 제한(IP, 15분/5회).
  it("429 TOO_MANY_ATTEMPTS when the signup IP attempt count has reached 5, and does not record another row", async () => {
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("select count(*)")) return { rows: [{ count: "5" }] };
      return { rows: [] };
    });

    const res = await POST(
      makeRequest({
        email: "user@example.com",
        password: "password123",
        consents: { collection_use: true, overseas_transfer: true },
      }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("TOO_MANY_ATTEMPTS");
    expect(connectMock).not.toHaveBeenCalled();
    const inserts = poolQueryMock.mock.calls.filter(([sql]) => String(sql).includes("insert into auth_attempts"));
    expect(inserts).toHaveLength(0);
  });

  it("records a signup_attempt/ip row on every non-blocked request regardless of outcome", async () => {
    await POST(
      makeRequest({
        email: "user@example.com",
        password: "pw1234", // 짧은 비밀번호로 실패해도 기록은 남는다
        consents: { collection_use: true, overseas_transfer: true },
      }),
    );
    const inserts = poolQueryMock.mock.calls.filter(([sql]) => String(sql).includes("insert into auth_attempts"));
    expect(inserts).toHaveLength(1);
    expect(inserts[0][1]).toEqual(["signup_attempt", "ip", expect.any(String)]);
  });
});
