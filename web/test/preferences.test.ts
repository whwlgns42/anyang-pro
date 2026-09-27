import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();
const embedTextMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/embeddings", () => ({ embedText: (...args: unknown[]) => embedTextMock(...args) }));

const { PUT } = await import("@/app/api/preferences/[id]/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/preferences/pref-1", {
    method: "PUT",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PUT>[0];
}

describe("PUT /api/preferences/:id", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
    embedTextMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
  });

  it("rolls back (no update) when embedding fails, returns 502", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select id from user_preferences")) return { rows: [{ id: "pref-1" }] };
      return { rows: [] };
    });
    embedTextMock.mockRejectedValue(new Error("EMBEDDING_NOT_CONNECTED"));

    const res = await PUT(makeRequest({ preference_text: "새 선호" }), {
      params: Promise.resolve({ id: "pref-1" }),
    });

    expect(res.status).toBe(502);
    expect(queryMock.mock.calls.some(([sql]) => String(sql).includes("update user_preferences"))).toBe(
      false,
    );
  });

  it("updates text + embedding together on success", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select id from user_preferences")) return { rows: [{ id: "pref-1" }] };
      return { rows: [] };
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });

    const res = await PUT(makeRequest({ preference_text: "새 선호" }), {
      params: Promise.resolve({ id: "pref-1" }),
    });

    expect(res.status).toBe(200);
    const updateCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("update user_preferences"));
    expect(updateCall).toBeDefined();
  });

  it("404 when preference does not belong to the user", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select id from user_preferences")) return { rows: [] };
      return { rows: [] };
    });

    const res = await PUT(makeRequest({ preference_text: "새 선호" }), {
      params: Promise.resolve({ id: "pref-1" }),
    });
    expect(res.status).toBe(404);
    expect(embedTextMock).not.toHaveBeenCalled();
  });
});
