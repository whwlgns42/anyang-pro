import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const queryMock = vi.fn();
const sendPushMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/web-push", () => ({
  sendPushNotification: (...args: unknown[]) => sendPushMock(...args),
  isGoneSubscriptionError: (err: unknown) => {
    const status = (err as { statusCode?: number } | null)?.statusCode;
    return status === 410 || status === 404;
  },
}));

const { POST } = await import("@/app/api/jobs/notify/route");

function makeRequest(secret?: string) {
  return new Request("http://localhost/api/jobs/notify", {
    method: "POST",
    headers: secret ? { "x-scheduler-secret": secret } : {},
  });
}

describe("POST /api/jobs/notify", () => {
  const original = process.env.SCHEDULER_SHARED_SECRET;

  beforeEach(() => {
    queryMock.mockReset();
    sendPushMock.mockReset();
    process.env.SCHEDULER_SHARED_SECRET = "secret";
  });

  afterEach(() => {
    process.env.SCHEDULER_SHARED_SECRET = original;
  });

  it("401 without valid scheduler secret", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("skips users without enabled_at (legacy rows excluded)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("from notify_settings ns") && text.includes("join users")) {
        return { rows: [{ user_id: "u1" }] };
      }
      if (text.includes("select enabled_at from notify_settings")) return { rows: [{ enabled_at: null }] };
      return { rows: [] };
    });

    const res = await POST(makeRequest("secret"));
    const json = (await res.json()) as { sent_count: number };
    expect(json.sent_count).toBe(0);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("skips users with no preferences (no similarity target)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("from notify_settings ns") && text.includes("join users")) {
        return { rows: [{ user_id: "u1" }] };
      }
      if (text.includes("select enabled_at from notify_settings")) {
        return { rows: [{ enabled_at: new Date("2026-01-01") }] };
      }
      if (text.includes("select embedding from user_preferences")) return { rows: [] };
      return { rows: [] };
    });

    const res = await POST(makeRequest("secret"));
    const json = (await res.json()) as { sent_count: number };
    expect(json.sent_count).toBe(0);
  });

  it("reserves via notify_logs, sends push for matches above the threshold, and marks success", async () => {
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      const text = String(sql);
      if (text.includes("from notify_settings ns") && text.includes("join users")) {
        return { rows: [{ user_id: "u1" }] };
      }
      if (text.includes("select enabled_at from notify_settings")) {
        return { rows: [{ enabled_at: new Date("2026-01-01") }] };
      }
      if (text.includes("select embedding from user_preferences")) {
        return { rows: [{ embedding: JSON.stringify([1, 0]) }] };
      }
      if (text.includes("from notice_chunks nc")) {
        return { rows: [{ id: "notice-1", similarity: 0.9 }] };
      }
      if (text.includes("insert into notify_logs")) {
        return { rows: [], rowCount: 1 };
      }
      if (text.includes("select endpoint, p256dh, auth from push_subscriptions")) {
        return { rows: [{ endpoint: "e", p256dh: "p", auth: "a" }] };
      }
      if (text.includes("select title from notices")) {
        return { rows: [{ title: "새 공지" }] };
      }
      if (text.includes("update notify_logs set result = 'success'")) {
        void params;
        return { rows: [] };
      }
      return { rows: [] };
    });
    sendPushMock.mockResolvedValue(undefined);

    const res = await POST(makeRequest("secret"));
    const json = (await res.json()) as { sent_count: number };
    expect(json.sent_count).toBe(1);
    expect(sendPushMock).toHaveBeenCalledWith({ endpoint: "e", p256dh: "p", auth: "a" }, expect.any(String));

    const successCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("result = 'success'"));
    expect(successCall?.[1]).toEqual(["u1", "notice-1"]);
  });

  it("does not send when similarity is below the threshold", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("from notify_settings ns") && text.includes("join users")) {
        return { rows: [{ user_id: "u1" }] };
      }
      if (text.includes("select enabled_at from notify_settings")) {
        return { rows: [{ enabled_at: new Date("2026-01-01") }] };
      }
      if (text.includes("select embedding from user_preferences")) {
        return { rows: [{ embedding: JSON.stringify([1, 0]) }] };
      }
      if (text.includes("from notice_chunks nc")) {
        return { rows: [{ id: "notice-1", similarity: 0.5 }] };
      }
      return { rows: [] };
    });

    const res = await POST(makeRequest("secret"));
    const json = (await res.json()) as { sent_count: number };
    expect(json.sent_count).toBe(0);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("deletes a subscription on 410 (Gone), tries the remaining device, and still marks success", async () => {
    const deleteCalls: unknown[][] = [];
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      const text = String(sql);
      if (text.includes("from notify_settings ns") && text.includes("join users")) {
        return { rows: [{ user_id: "u1" }] };
      }
      if (text.includes("select enabled_at from notify_settings")) {
        return { rows: [{ enabled_at: new Date("2026-01-01") }] };
      }
      if (text.includes("select embedding from user_preferences")) {
        return { rows: [{ embedding: JSON.stringify([1, 0]) }] };
      }
      if (text.includes("from notice_chunks nc")) {
        return { rows: [{ id: "notice-1", similarity: 0.9 }] };
      }
      if (text.includes("insert into notify_logs")) {
        return { rows: [], rowCount: 1 };
      }
      if (text.includes("select endpoint, p256dh, auth from push_subscriptions")) {
        return {
          rows: [
            { endpoint: "gone-endpoint", p256dh: "p", auth: "a" },
            { endpoint: "live-endpoint", p256dh: "p", auth: "a" },
          ],
        };
      }
      if (text.includes("select title from notices")) return { rows: [{ title: "새 공지" }] };
      if (text.includes("delete from push_subscriptions")) {
        deleteCalls.push(params ?? []);
        return { rows: [] };
      }
      return { rows: [] };
    });
    sendPushMock.mockImplementation(async (device: { endpoint: string }) => {
      if (device.endpoint === "gone-endpoint") {
        const err = new Error("Gone") as Error & { statusCode: number };
        err.statusCode = 410;
        throw err;
      }
    });

    const res = await POST(makeRequest("secret"));
    const json = (await res.json()) as { sent_count: number };
    expect(json.sent_count).toBe(1);
    expect(deleteCalls).toEqual([["gone-endpoint"]]);

    const successCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("result = 'success'"));
    expect(successCall).toBeDefined();
  });

  it("marks failed when a non-gone error occurs on any device (existing strict behavior)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("from notify_settings ns") && text.includes("join users")) {
        return { rows: [{ user_id: "u1" }] };
      }
      if (text.includes("select enabled_at from notify_settings")) {
        return { rows: [{ enabled_at: new Date("2026-01-01") }] };
      }
      if (text.includes("select embedding from user_preferences")) {
        return { rows: [{ embedding: JSON.stringify([1, 0]) }] };
      }
      if (text.includes("from notice_chunks nc")) {
        return { rows: [{ id: "notice-1", similarity: 0.9 }] };
      }
      if (text.includes("insert into notify_logs")) return { rows: [], rowCount: 1 };
      if (text.includes("select endpoint, p256dh, auth from push_subscriptions")) {
        return { rows: [{ endpoint: "e", p256dh: "p", auth: "a" }] };
      }
      if (text.includes("select title from notices")) return { rows: [{ title: "새 공지" }] };
      return { rows: [] };
    });
    sendPushMock.mockRejectedValue(new Error("network error"));

    const res = await POST(makeRequest("secret"));
    const json = (await res.json()) as { sent_count: number };
    expect(json.sent_count).toBe(0);

    const failedCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("result = 'failed'"));
    expect(failedCall).toBeDefined();
  });

  it("skips sending when notify_logs is already reserved and not stale (no duplicate send)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("from notify_settings ns") && text.includes("join users")) {
        return { rows: [{ user_id: "u1" }] };
      }
      if (text.includes("select enabled_at from notify_settings")) {
        return { rows: [{ enabled_at: new Date("2026-01-01") }] };
      }
      if (text.includes("select embedding from user_preferences")) {
        return { rows: [{ embedding: JSON.stringify([1, 0]) }] };
      }
      if (text.includes("from notice_chunks nc")) {
        return { rows: [{ id: "notice-1", similarity: 0.9 }] };
      }
      if (text.includes("insert into notify_logs")) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes("update notify_logs set reserved_at")) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [] };
    });

    const res = await POST(makeRequest("secret"));
    const json = (await res.json()) as { sent_count: number };
    expect(json.sent_count).toBe(0);
    expect(sendPushMock).not.toHaveBeenCalled();
  });
});
