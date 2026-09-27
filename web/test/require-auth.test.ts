import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { requireUser } = await import("@/lib/require-auth");

describe("requireUser", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
  });

  it("401 when no session", async () => {
    authMock.mockResolvedValue(null);
    const result = await requireUser();
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("403 ACCOUNT_SUSPENDED when suspended_at is set", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock.mockResolvedValueOnce({ rows: [{ suspended_at: new Date() }] });

    const result = await requireUser();
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("ACCOUNT_SUSPENDED");
  });

  it("403 CONSENT_REQUIRED with missing types when policy_version stale", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    queryMock
      .mockResolvedValueOnce({ rows: [{ suspended_at: null }] }) // suspended check
      .mockResolvedValueOnce({ rows: [{ policy_version: "old" }] }) // collection_use
      .mockResolvedValueOnce({ rows: [] }); // overseas_transfer missing entirely

    const result = await requireUser();
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("CONSENT_REQUIRED");
    expect(body.missing).toEqual(["collection_use", "overseas_transfer"]);
  });

  it("passes through when suspended and consent checks are skipped", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    const result = await requireUser({ skipSuspended: true, skipConsent: true });
    expect(result).toEqual({ userId: "u1", email: "a@b.com" });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
