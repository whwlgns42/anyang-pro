import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));

const { extractIp, isBlocked, recordAttempt } = await import("@/lib/auth-attempts");

describe("extractIp", () => {
  it("uses the first x-forwarded-for value", () => {
    const req = new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(extractIp(req)).toBe("1.2.3.4");
  });

  it("falls back to 127.0.0.1 without the header (local dev)", () => {
    const req = new Request("http://localhost");
    expect(extractIp(req)).toBe("127.0.0.1");
  });
});

describe("isBlocked / recordAttempt", () => {
  beforeEach(() => queryMock.mockReset());

  it("not blocked when count is below 5", async () => {
    queryMock.mockResolvedValue({ rows: [{ count: "4" }] });
    expect(await isBlocked("login_failure", "email", "a@b.com")).toBe(false);
  });

  it("blocked when count reaches 5 (15분/5회 초과, 확인 항목 29)", async () => {
    queryMock.mockResolvedValue({ rows: [{ count: "5" }] });
    expect(await isBlocked("login_failure", "ip", "1.2.3.4")).toBe(true);
  });

  it("recordAttempt inserts a row with attempt_type/identifier_type", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await recordAttempt("signup_attempt", "ip", "1.2.3.4");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("insert into auth_attempts");
    expect(params[0]).toBe("signup_attempt");
    expect(params[1]).toBe("ip");
  });
});
