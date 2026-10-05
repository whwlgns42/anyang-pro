import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const connectMock = vi.fn();
vi.mock("@/lib/db", () => ({
  pool: { query: (...args: unknown[]) => queryMock(...args), connect: () => connectMock() },
}));

const { extractIp, isBlocked, recordAttempt, claimChatSlot } = await import("@/lib/auth-attempts");

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

// anyang-backend-api 3-4-2절(확인 항목 63) — claimChatSlot: begin → 락 → 삽입 → commit, 항상 release.
describe("claimChatSlot", () => {
  const clientQuery = vi.fn();
  const release = vi.fn();
  beforeEach(() => {
    clientQuery.mockReset();
    release.mockReset();
    connectMock.mockReset();
    connectMock.mockResolvedValue({ query: clientQuery, release });
  });
  const sqls = () => clientQuery.mock.calls.map(([s]) => String(s));

  it("allows when the insert affects a row", async () => {
    clientQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    expect(await claimChatSlot("u1")).toEqual({ ok: true });
    const all = sqls();
    expect(all[0]).toBe("begin");
    expect(all[1]).toContain("pg_advisory_xact_lock");
    expect(all[2]).toContain("insert into auth_attempts");
    expect(all[2]).toContain("interval '24 hours'");
    expect(all[2]).toContain("interval '1 minute'");
    expect(all[2]).toContain("< 5");
    expect(all[2]).toContain("< 100");
    expect(all[3]).toBe("commit");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("refuses with limit day when 100 rows in 24h, minute otherwise", async () => {
    clientQuery.mockImplementation(async (s: string) =>
      String(s).trim().startsWith("insert") ? { rowCount: 0, rows: [] } : { rowCount: 1, rows: [{ d: "100" }] },
    );
    expect(await claimChatSlot("u1")).toEqual({ ok: false, limit: "day" });
    clientQuery.mockImplementation(async (s: string) =>
      String(s).trim().startsWith("insert") ? { rowCount: 0, rows: [] } : { rowCount: 1, rows: [{ d: "7" }] },
    );
    expect(await claimChatSlot("u1")).toEqual({ ok: false, limit: "minute" });
    expect(release).toHaveBeenCalledTimes(2);
  });

  it("rolls back, releases and rethrows on error", async () => {
    clientQuery.mockImplementation(async (s: string) => {
      if (String(s).includes("pg_advisory")) throw new Error("boom");
      return { rowCount: 0, rows: [] };
    });
    await expect(claimChatSlot("u1")).rejects.toThrow("boom");
    expect(sqls()).toContain("rollback");
    expect(release).toHaveBeenCalledTimes(1);
  });
});
