import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { POST, DELETE } = await import("@/app/api/push/subscribe/route");

function makeRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/push/subscribe", {
    method,
    body: JSON.stringify(body),
  });
}

function mockAuthenticatedQueries(): void {
  queryMock.mockImplementation(async (sql: string) => {
    const text = String(sql);
    if (text.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
    if (text.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
    return { rows: [] };
  });
}

describe("POST /api/push/subscribe", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
  });

  it("401 when not logged in", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { endpoint: "e", p256dh: "p", auth: "a" }) as never);
    expect(res.status).toBe(401);
  });

  it("400 on missing fields", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    mockAuthenticatedQueries();
    const res = await POST(makeRequest("POST", { endpoint: "e" }) as never);
    expect(res.status).toBe(400);
  });

  it("upserts subscription on success", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    mockAuthenticatedQueries();

    const res = await POST(makeRequest("POST", { endpoint: "e", p256dh: "p", auth: "a" }) as never);
    expect(res.status).toBe(200);
    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into push_subscriptions"));
    expect(insertCall?.[1]).toEqual(["u1", "e", "p", "a"]);
  });
});

describe("DELETE /api/push/subscribe", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
  });

  it("401 when not logged in", async () => {
    authMock.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", { endpoint: "e" }) as never);
    expect(res.status).toBe(401);
  });

  it("deletes the subscription scoped to the user", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    mockAuthenticatedQueries();

    const res = await DELETE(makeRequest("DELETE", { endpoint: "e" }) as never);
    expect(res.status).toBe(204);
    const deleteCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("delete from push_subscriptions"));
    expect(deleteCall?.[1]).toEqual(["e", "u1"]);
  });
});
