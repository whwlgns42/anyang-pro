import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const verifyPasswordMock = vi.fn();
const isBlockedMock = vi.fn();
const recordAttemptMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/password", () => ({ verifyPassword: (...args: unknown[]) => verifyPasswordMock(...args) }));
vi.mock("@/lib/auth-attempts", () => ({
  extractIp: () => "1.2.3.4",
  isBlocked: (...args: unknown[]) => isBlockedMock(...args),
  recordAttempt: (...args: unknown[]) => recordAttemptMock(...args),
}));

const { authorizeCredentials, TooManyAttemptsSignin } = await import("@/lib/authorize-credentials");

function req() {
  return new Request("http://localhost");
}

describe("authorizeCredentials (anyang-backend-api 1-6절, 확인 항목 29)", () => {
  beforeEach(() => {
    queryMock.mockReset();
    verifyPasswordMock.mockReset();
    isBlockedMock.mockReset();
    recordAttemptMock.mockReset();
    isBlockedMock.mockResolvedValue(false);
  });

  it("returns null on missing email/password without any DB lookup", async () => {
    expect(await authorizeCredentials("", "pw", req())).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("throws TooManyAttemptsSignin when email or IP is blocked, without checking the password", async () => {
    isBlockedMock.mockResolvedValueOnce(true); // email blocked
    await expect(authorizeCredentials("a@b.com", "pw", req())).rejects.toBeInstanceOf(TooManyAttemptsSignin);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("records a login_failure attempt (email + ip) on wrong password", async () => {
    queryMock.mockResolvedValue({ rows: [{ id: "u1", email: "a@b.com", password_hash: "hash" }] });
    verifyPasswordMock.mockResolvedValue(false);

    const result = await authorizeCredentials("a@b.com", "wrong", req());
    expect(result).toBeNull();
    expect(recordAttemptMock).toHaveBeenCalledWith("login_failure", "email", "a@b.com");
    expect(recordAttemptMock).toHaveBeenCalledWith("login_failure", "ip", "1.2.3.4");
  });

  it("records a login_failure attempt for a nonexistent account (계정 열거 방지 — 같은 응답)", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const result = await authorizeCredentials("nobody@b.com", "pw", req());
    expect(result).toBeNull();
    expect(verifyPasswordMock).not.toHaveBeenCalled();
    expect(recordAttemptMock).toHaveBeenCalledWith("login_failure", "email", "nobody@b.com");
  });

  it("returns the user without recording an attempt on success", async () => {
    queryMock.mockResolvedValue({ rows: [{ id: "u1", email: "a@b.com", password_hash: "hash" }] });
    verifyPasswordMock.mockResolvedValue(true);

    const result = await authorizeCredentials("a@b.com", "right", req());
    expect(result).toEqual({ id: "u1", email: "a@b.com" });
    expect(recordAttemptMock).not.toHaveBeenCalled();
  });
});
