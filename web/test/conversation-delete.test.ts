import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { DELETE } = await import("@/app/api/conversations/[id]/route");

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const call = (id: string) =>
  DELETE(new Request(`http://localhost/api/conversations/${id}`, { method: "DELETE" }) as never, {
    params: Promise.resolve({ id }),
  });
const deleteCalls = () => queryMock.mock.calls.filter(([sql]) => String(sql).includes("delete from conversations"));

describe("DELETE /api/conversations/:id", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      return { rows: [], rowCount: 0 };
    });
  });

  it("204 and deletes with owner condition (even when 0 rows: not-owned/missing/repeat)", async () => {
    const res = await call(UUID);
    expect(res.status).toBe(204);
    expect(deleteCalls()).toHaveLength(1);
    expect(deleteCalls()[0][1]).toEqual([UUID, "u1"]);
    expect((await call(UUID)).status).toBe(204);
  });

  it("204 without querying when id is not a UUID", async () => {
    const res = await call("not-a-uuid");
    expect(res.status).toBe(204);
    expect(deleteCalls()).toHaveLength(0);
  });

  it("401 when no session", async () => {
    authMock.mockResolvedValue(null);
    expect((await call(UUID)).status).toBe(401);
    expect(deleteCalls()).toHaveLength(0);
  });

  it("403 ACCOUNT_SUSPENDED", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      sql.includes("suspended_at") ? { rows: [{ suspended_at: new Date() }] } : { rows: [] },
    );
    const res = await call(UUID);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "ACCOUNT_SUSPENDED" });
    expect(deleteCalls()).toHaveLength(0);
  });

  it("FK violation (0023 not applied) propagates, not hidden as 204", async () => {
    const orig = queryMock.getMockImplementation()!;
    queryMock.mockImplementation(async (sql: string, p: unknown[]) => {
      if (sql.includes("delete from conversations")) throw Object.assign(new Error("fk"), { code: "23503" });
      return orig(sql, p);
    });
    await expect(call(UUID)).rejects.toThrow("fk");
  });
});
