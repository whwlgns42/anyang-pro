import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  requireAnyJobSecret,
  requireBackfillSecret,
  requireCollectorSecret,
  requireNotifyJobSecret,
  requireSchedulerSecret,
} from "@/lib/scheduler-auth";
import { verifySchedulerSecret } from "@/lib/scheduler-auth";

describe("scheduler shared secret", () => {
  const original = process.env.SCHEDULER_SHARED_SECRET;

  beforeEach(() => {
    process.env.SCHEDULER_SHARED_SECRET = "test-secret-value";
  });

  afterEach(() => {
    process.env.SCHEDULER_SHARED_SECRET = original;
  });

  it("rejects missing header", () => {
    const req = new Request("http://localhost/api/jobs/notify");
    expect(verifySchedulerSecret(req)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const req = new Request("http://localhost/api/jobs/notify", {
      headers: { "x-scheduler-secret": "nope" },
    });
    expect(verifySchedulerSecret(req)).toBe(false);
  });

  it("accepts matching secret", () => {
    const req = new Request("http://localhost/api/jobs/notify", {
      headers: { "x-scheduler-secret": "test-secret-value" },
    });
    expect(verifySchedulerSecret(req)).toBe(true);
  });
});

// anyang-backend-api 7-1절 — NOTIFY_TRIGGER_SECRET은 notify 라우트에서만 통한다.
describe("notify trigger secret", () => {
  const saved = { n: process.env.NOTIFY_TRIGGER_SECRET, s: process.env.SCHEDULER_SHARED_SECRET };
  const req = (h: Record<string, string>) => new Request("http://localhost/api/jobs/notify", { headers: h });

  beforeEach(() => {
    process.env.NOTIFY_TRIGGER_SECRET = "notify-key";
    process.env.SCHEDULER_SHARED_SECRET = "sched-key";
  });
  afterEach(() => {
    process.env.NOTIFY_TRIGGER_SECRET = saved.n;
    process.env.SCHEDULER_SHARED_SECRET = saved.s;
  });

  it("notify accepts x-notify-secret and still accepts x-scheduler-secret", () => {
    expect(requireNotifyJobSecret(req({ "x-notify-secret": "notify-key" }))).toBeNull();
    expect(requireNotifyJobSecret(req({ "x-scheduler-secret": "sched-key" }))).toBeNull();
  });

  it("notify rejects missing or wrong keys", () => {
    expect(requireNotifyJobSecret(req({}))?.status).toBe(401);
    expect(requireNotifyJobSecret(req({ "x-notify-secret": "nope" }))?.status).toBe(401);
  });

  it("empty NOTIFY_TRIGGER_SECRET never matches (even an empty header)", () => {
    process.env.NOTIFY_TRIGGER_SECRET = "";
    expect(requireNotifyJobSecret(req({ "x-notify-secret": "" }))?.status).toBe(401);
    expect(requireNotifyJobSecret(req({ "x-notify-secret": "notify-key" }))?.status).toBe(401);
  });

  it("other job routes reject x-notify-secret", () => {
    const r = req({ "x-notify-secret": "notify-key" });
    expect(requireSchedulerSecret(r)?.status).toBe(401); // collect
    expect(requireAnyJobSecret(r)?.status).toBe(401); // embed
    expect(requireCollectorSecret(r)?.status).toBe(401); // ingest
    expect(requireBackfillSecret(r)?.status).toBe(401);
  });

  it("notify does not accept backfill or collector keys", () => {
    process.env.BACKFILL_SECRET = "bf";
    process.env.COLLECTOR_INGEST_SECRET = "cs";
    expect(requireNotifyJobSecret(req({ "x-backfill-secret": "bf" }))?.status).toBe(401);
    expect(requireNotifyJobSecret(req({ "x-collector-secret": "cs" }))?.status).toBe(401);
    delete process.env.BACKFILL_SECRET;
    delete process.env.COLLECTOR_INGEST_SECRET;
  });
});
