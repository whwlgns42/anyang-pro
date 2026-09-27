import { describe, expect, it, vi, beforeEach } from "vitest";

const clientQuery = vi.fn();
const client = { query: clientQuery, release: vi.fn() };
const connectMock = vi.fn(async () => client);
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { connect: () => connectMock() } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { DELETE } = await import("@/app/api/account/route");

describe("DELETE /api/account", () => {
  beforeEach(() => {
    clientQuery.mockReset();
    authMock.mockReset();
  });

  it("401 when not logged in", async () => {
    authMock.mockResolvedValue(null);
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("withdraws consents before deleting the user, in order", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    clientQuery.mockResolvedValue(undefined);

    const res = await DELETE();
    expect(res.status).toBe(204);

    const sqlCalls = clientQuery.mock.calls.map(([sql]) => String(sql));
    const consentIdx = sqlCalls.findIndex((sql) => sql.includes("update consents"));
    const deleteIdx = sqlCalls.findIndex((sql) => sql.includes("delete from users"));
    expect(consentIdx).toBeGreaterThanOrEqual(0);
    expect(deleteIdx).toBeGreaterThan(consentIdx);
  });

  it("allowed even for suspended accounts (no suspended check query)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    clientQuery.mockResolvedValue(undefined);

    await DELETE();
    const sqlCalls = clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(sqlCalls.some((sql) => sql.includes("suspended_at"))).toBe(false);
  });
});
