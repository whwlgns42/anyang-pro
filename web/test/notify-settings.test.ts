import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { PUT } = await import("@/app/api/notify-settings/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/notify-settings", {
    method: "PUT",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PUT>[0];
}

describe("PUT /api/notify-settings", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    // requireUser: suspended check + consent x2 all pass
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      return { rows: [] };
    });
  });

  it("400 on invalid time format", async () => {
    const res = await PUT(makeRequest({ notify_time: "25:00", enabled: true }));
    expect(res.status).toBe(400);
  });

  it("stamps enabled_at on first creation", async () => {
    // override: notify_settings select (existing row) -> none
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select enabled from notify_settings")) return { rows: [] };
      return { rows: [] };
    });

    const res = await PUT(makeRequest({ notify_time: "08:30", enabled: true }));
    expect(res.status).toBe(200);

    const upsertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into notify_settings"));
    expect(upsertCall).toBeDefined();
    const params = upsertCall?.[1] as unknown[];
    expect(params[3]).toBe(true); // shouldStampEnabledAt
  });

  it("stamps enabled_at on false -> true transition", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select enabled from notify_settings")) return { rows: [{ enabled: false }] };
      return { rows: [] };
    });

    const res = await PUT(makeRequest({ notify_time: "08:30", enabled: true }));
    expect(res.status).toBe(200);
    const upsertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into notify_settings"));
    const params = upsertCall?.[1] as unknown[];
    expect(params[3]).toBe(true);
  });

  it("does not stamp enabled_at when staying enabled", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select enabled from notify_settings")) return { rows: [{ enabled: true }] };
      return { rows: [] };
    });

    const res = await PUT(makeRequest({ notify_time: "08:30", enabled: true }));
    expect(res.status).toBe(200);
    const upsertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into notify_settings"));
    const params = upsertCall?.[1] as unknown[];
    expect(params[3]).toBe(false);
  });
});
