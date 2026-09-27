import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { requireAdmin } = await import("@/lib/require-admin");

describe("requireAdmin", () => {
  const original = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    authMock.mockReset();
    process.env.ADMIN_EMAILS = "admin@example.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = original;
  });

  it("401 when not logged in", async () => {
    authMock.mockResolvedValue(null);
    const result = await requireAdmin();
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("403 ADMIN_ONLY when logged in but email not in ADMIN_EMAILS", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", email: "not-admin@example.com" },
      provider: "google",
    });
    const result = await requireAdmin();
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("ADMIN_ONLY");
  });

  it("403 ADMIN_ONLY when admin email logged in via credentials (not google)", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", email: "admin@example.com" },
      provider: "credentials",
    });
    const result = await requireAdmin();
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("ADMIN_ONLY");
  });

  it("passes when admin email logged in via google", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", email: "Admin@Example.com" },
      provider: "google",
    });
    const result = await requireAdmin();
    expect(result).toEqual({ userId: "u1", email: "Admin@Example.com" });
  });
});
