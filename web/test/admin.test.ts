import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const connectMock = vi.fn();
const requireAdminMock = vi.fn();
const runCollectJobMock = vi.fn();

vi.mock("@/lib/db", () => ({
  pool: { query: (...args: unknown[]) => queryMock(...args), connect: () => connectMock() },
}));
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => requireAdminMock() }));
vi.mock("@/lib/collector", () => ({ runCollectJob: (...args: unknown[]) => runCollectJobMock(...args) }));

const collectRuns = await import("@/app/api/admin/collect-runs/route");
const hideNotice = await import("@/app/api/admin/notices/[id]/hide/route");
const unhideNotice = await import("@/app/api/admin/notices/[id]/unhide/route");
const adminUsers = await import("@/app/api/admin/users/route");
const suspendUser = await import("@/app/api/admin/users/[id]/suspend/route");
const unsuspendUser = await import("@/app/api/admin/users/[id]/unsuspend/route");
const deleteUser = await import("@/app/api/admin/users/[id]/route");
const stats = await import("@/app/api/admin/stats/route");
const notifyLogsSummary = await import("@/app/api/admin/notify-logs/summary/route");
const apiUsageSummary = await import("@/app/api/admin/api-usage/summary/route");

const FORBIDDEN = new Response(JSON.stringify({ error: "ADMIN_ONLY" }), { status: 403 });

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function nextRequest(input: string, init?: RequestInit) {
  return new Request(input, init) as unknown as Parameters<typeof hideNotice.PATCH>[0];
}

describe("admin API endpoints reject non-admins", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    requireAdminMock.mockReset();
    runCollectJobMock.mockReset();
    requireAdminMock.mockResolvedValue(FORBIDDEN);
  });

  it("collect-runs GET/POST 403", async () => {
    expect((await collectRuns.GET()).status).toBe(403);
    expect((await collectRuns.POST()).status).toBe(403);
  });

  it("notices hide/unhide 403", async () => {
    expect((await hideNotice.PATCH(nextRequest("http://x"), params("n1"))).status).toBe(403);
    expect((await unhideNotice.PATCH(nextRequest("http://x"), params("n1"))).status).toBe(403);
  });

  it("users list/suspend/unsuspend/delete 403", async () => {
    expect((await adminUsers.GET()).status).toBe(403);
    expect((await suspendUser.PATCH(new Request("http://x"), params("u1"))).status).toBe(403);
    expect((await unsuspendUser.PATCH(new Request("http://x"), params("u1"))).status).toBe(403);
    expect((await deleteUser.DELETE(new Request("http://x"), params("u1"))).status).toBe(403);
  });

  it("stats/notify-logs summary/api-usage summary 403", async () => {
    expect((await stats.GET()).status).toBe(403);
    expect(
      (await notifyLogsSummary.GET(new Request("http://x/api/admin/notify-logs/summary") as never)).status,
    ).toBe(403);
    expect(
      (await apiUsageSummary.GET(new Request("http://x/api/admin/api-usage/summary") as never)).status,
    ).toBe(403);
  });
});

describe("admin API endpoints when admin", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    requireAdminMock.mockReset();
    runCollectJobMock.mockReset();
    requireAdminMock.mockResolvedValue({ userId: "admin1", email: "admin@example.com" });
  });

  it("POST /api/admin/collect-runs runs manual collect with admin id", async () => {
    runCollectJobMock.mockResolvedValue({ ok: true, collectedCount: 3 });
    const res = await collectRuns.POST();
    expect(res.status).toBe(200);
    expect(runCollectJobMock).toHaveBeenCalledWith("manual", "admin1");
    expect(await res.json()).toEqual({ collected_count: 3 });
  });

  it("GET /api/admin/collect-runs returns rows without raw content fields", async () => {
    queryMock.mockResolvedValue({
      rows: [{ id: "r1", started_at: new Date(), status: "success", collected_count: 2 }],
    });
    const res = await collectRuns.GET();
    const body = await res.json();
    expect(body[0].id).toBe("r1");
  });

  it("PATCH hide sets hidden_at and hidden_reason", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const req = nextRequest("http://x", {
      method: "PATCH",
      body: JSON.stringify({ hidden_reason: "spam" }),
    });
    const res = await hideNotice.PATCH(req, params("n1"));
    expect(res.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("hidden_at = now()"), ["n1", "spam"]);
  });

  it("PATCH unhide clears hidden_at", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const res = await unhideNotice.PATCH(nextRequest("http://x"), params("n1"));
    expect(res.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("hidden_at = null"), ["n1"]);
  });

  it("GET /api/admin/users returns only minimal fields (no raw conversation/preference content)", async () => {
    queryMock.mockResolvedValue({
      rows: [{ id: "u1", email: "a@b.com", created_at: new Date(), suspended_at: null }],
    });
    const res = await adminUsers.GET();
    const body = await res.json();
    expect(Object.keys(body[0]).sort()).toEqual(["created_at", "email", "id", "suspended_at"]);
  });

  it("suspend/unsuspend update suspended_at", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await suspendUser.PATCH(new Request("http://x"), params("u1"));
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("suspended_at = now()"), ["u1"]);

    await unsuspendUser.PATCH(new Request("http://x"), params("u1"));
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("suspended_at = null"), ["u1"]);
  });

  it("DELETE /api/admin/users/:id withdraws consents before deleting user", async () => {
    const clientQuery = vi.fn().mockResolvedValue(undefined);
    connectMock.mockResolvedValue({ query: clientQuery, release: vi.fn() });

    const res = await deleteUser.DELETE(new Request("http://x"), params("u1"));
    expect(res.status).toBe(204);

    const sqlCalls = clientQuery.mock.calls.map(([sql]) => String(sql));
    const consentIdx = sqlCalls.findIndex((sql) => sql.includes("update consents"));
    const deleteIdx = sqlCalls.findIndex((sql) => sql.includes("delete from users"));
    expect(consentIdx).toBeGreaterThanOrEqual(0);
    expect(deleteIdx).toBeGreaterThan(consentIdx);
  });

  it("GET /api/admin/stats returns aggregate counts only (no per-user rows)", async () => {
    queryMock.mockResolvedValue({ rows: [{ count: "5" }] });
    const res = await stats.GET();
    const body = await res.json();
    expect(body.total_users).toBe(5);
    expect(Array.isArray(body.by_birth_decade)).toBe(true);
  });

  it("GET /api/admin/notify-logs/summary returns daily + subscription counts", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("notify_logs")) {
        return { rows: [{ day: new Date("2026-01-01"), result: "success", count: "3" }] };
      }
      if (sql.includes("notify_settings")) return { rows: [{ count: "10" }] };
      if (sql.includes("push_subscriptions")) return { rows: [{ count: "12" }] };
      return { rows: [] };
    });
    const res = await notifyLogsSummary.GET(
      new Request("http://x/api/admin/notify-logs/summary") as never,
    );
    const body = await res.json();
    expect(body.notify_enabled_count).toBe(10);
    expect(body.push_device_count).toBe(12);
    expect(body.daily[0].success_count).toBe(3);
  });

  it("GET /api/admin/api-usage/summary computes gemini limit_note and null for deepseek", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          provider: "gemini",
          day: new Date("2026-01-01"),
          success_count: "50",
          rate_limited_count: "0",
          error_count: "0",
          input_tokens: "100",
          output_tokens: "50",
        },
        {
          provider: "deepseek",
          day: new Date("2026-01-01"),
          success_count: "20",
          rate_limited_count: "1",
          error_count: "0",
          input_tokens: null,
          output_tokens: null,
        },
      ],
    });
    const res = await apiUsageSummary.GET(new Request("http://x/api/admin/api-usage/summary") as never);
    const body = await res.json();
    const gemini = body.providers.find((p: { provider: string }) => p.provider === "gemini");
    const deepseek = body.providers.find((p: { provider: string }) => p.provider === "deepseek");
    expect(gemini.limit_note).toBe("50/1000");
    expect(deepseek.limit_note).toBeNull();
  });

  it("no admin endpoint response includes raw conversation/preference content fields", async () => {
    queryMock.mockResolvedValue({
      rows: [{ id: "u1", email: "a@b.com", created_at: new Date(), suspended_at: null }],
    });
    const res = await adminUsers.GET();
    const text = JSON.stringify(await res.json());
    expect(text).not.toMatch(/preference_text|"content"/);
  });
});
