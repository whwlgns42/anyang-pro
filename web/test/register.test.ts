import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const clientQuery = vi.fn();
const client = { query: clientQuery, release: vi.fn() };
const connectMock = vi.fn(async () => client);

vi.mock("@/lib/db", () => ({ pool: { connect: () => connectMock() } }));

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
    process.env.ADMIN_EMAILS = "admin@anyang.go.kr";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it("400 when a consent item is missing", async () => {
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        password: "pw",
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
        password: "pw",
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
        password: "pw",
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
        password: "pw",
        consents: { collection_use: true, overseas_transfer: true },
      }),
    );
    expect(res.status).toBe(409);
  });
});
