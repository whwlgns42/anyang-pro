import { describe, expect, it, beforeEach, afterEach } from "vitest";
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
