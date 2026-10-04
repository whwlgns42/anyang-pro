import { createHash } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();
const sendMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...a: unknown[]) => queryMock(...a) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/web-push", () => ({
  sendPushNotification: (...a: unknown[]) => sendMock(...a),
  isGoneSubscriptionError: (e: unknown) => [404, 410].includes((e as { statusCode?: number })?.statusCode ?? 0),
}));

const { POST } = await import("@/app/api/notify-settings/test/route");

const devices = [
  { endpoint: "e1", p256dh: "p", auth: "a" },
  { endpoint: "e2", p256dh: "p", auth: "a" },
];
let subs = devices;
let slotRowCount = 1;
let suspended: Date | null = null;

const sqls = () => queryMock.mock.calls.map(([s]) => String(s));

describe("POST /api/notify-settings/test", () => {
  beforeEach(() => {
    queryMock.mockReset();
    sendMock.mockReset();
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    subs = devices;
    slotRowCount = 1;
    suspended = null;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("suspended_at")) return { rows: [{ suspended_at: suspended }] };
      if (sql.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (sql.includes("select 1 from push_subscriptions")) return { rows: subs.slice(0, 1).map(() => ({})) };
      if (sql.includes("select endpoint")) return { rows: subs };
      if (sql.includes("insert into auth_attempts")) return { rows: [], rowCount: slotRowCount };
      return { rows: [], rowCount: 1 };
    });
  });

  it("401 without session, no send", async () => {
    authMock.mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("403 for suspended user, no push/slot queries", async () => {
    suspended = new Date();
    const res = await POST();
    expect(res.status).toBe(403);
    expect(sqls().some((s) => s.includes("push_subscriptions") || s.includes("auth_attempts"))).toBe(false);
  });

  it("409 when no subscription, slot not used", async () => {
    subs = [];
    const res = await POST();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "NO_SUBSCRIPTION" });
    expect(sqls().some((s) => s.includes("auth_attempts"))).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 sends payload to own devices only, no notify_logs", async () => {
    const res = await POST();
    expect(await res.json()).toEqual({ success_count: 2, failed_count: 0 });
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(sendMock.mock.calls[0][1])).toEqual({ title: "테스트 알림입니다", url: "/settings/notifications" });
    const subCall = queryMock.mock.calls.find(([s]) => String(s).includes("select endpoint"));
    expect(subCall?.[1]).toEqual(["u1"]);
    expect(sqls().some((s) => s.includes("notify_logs"))).toBe(false);
  });

  it("slot query uses sha256(user_id) and 1 minute window", async () => {
    await POST();
    const call = queryMock.mock.calls.find(([s]) => String(s).includes("insert into auth_attempts"));
    expect(call?.[1]).toEqual([createHash("sha256").update("u1").digest("hex")]);
    expect(String(call?.[0])).toContain("'test_notify'");
    expect(String(call?.[0])).toContain("interval '1 minute'");
  });

  it("429 when slot taken, no send", async () => {
    slotRowCount = 0;
    const res = await POST();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "TOO_MANY_ATTEMPTS" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("one failure + one success -> {1,1}, both attempted", async () => {
    sendMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(undefined);
    expect(await (await POST()).json()).toEqual({ success_count: 1, failed_count: 1 });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("410 devices deleted and not counted -> {0,0}", async () => {
    sendMock.mockRejectedValue({ statusCode: 410 });
    expect(await (await POST()).json()).toEqual({ success_count: 0, failed_count: 0 });
    const deletes = queryMock.mock.calls.filter(([s]) => String(s).includes("delete from push_subscriptions"));
    expect(deletes.map(([, p]) => p)).toEqual([["e1"], ["e2"]]);
  });
});
