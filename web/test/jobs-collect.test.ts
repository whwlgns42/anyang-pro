import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const runCollectJobMock = vi.fn();
const runEmbedJobMock = vi.fn();

vi.mock("@/lib/collector", () => ({ runCollectJob: (...args: unknown[]) => runCollectJobMock(...args) }));
const countUnembeddedMock = vi.fn();
vi.mock("@/lib/embed-job", () => ({
  runEmbedJob: (...args: unknown[]) => runEmbedJobMock(...args),
  countUnembedded: (...args: unknown[]) => countUnembeddedMock(...args),
}));

const { POST } = await import("@/app/api/jobs/collect/route");

function makeRequest(secret?: string, query = "") {
  return new Request(`http://localhost/api/jobs/collect${query}`, {
    method: "POST",
    headers: secret ? { "x-scheduler-secret": secret } : {},
  });
}

// anyang-backend-api 7절 표 "제안: 수집 잡 직후" — 수집 잡 끝에서 임베딩 파이프라인을 직접 호출한다.
describe("POST /api/jobs/collect", () => {
  const original = process.env.SCHEDULER_SHARED_SECRET;

  beforeEach(() => {
    runCollectJobMock.mockReset();
    runEmbedJobMock.mockReset();
    countUnembeddedMock.mockReset();
    process.env.SCHEDULER_SHARED_SECRET = "secret";
  });

  afterEach(() => {
    process.env.SCHEDULER_SHARED_SECRET = original;
    delete process.env.BACKFILL_SECRET;
    vi.useRealTimers();
  });

  it("401 without valid scheduler secret, does not run any job", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(runCollectJobMock).not.toHaveBeenCalled();
  });

  it("calls runEmbedJob after a successful collect run", async () => {
    runCollectJobMock.mockResolvedValue({ ok: true, collectedCount: 3 });
    runEmbedJobMock.mockResolvedValue({ processed_notices: 3, embedded_chunks: 3 });

    const res = await POST(makeRequest("secret"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { collected_count: number; mode: string };
    expect(json.collected_count).toBe(3);
    expect(json.mode).toBe("full");
    expect(runEmbedJobMock).toHaveBeenCalledTimes(1);
    expect(runCollectJobMock).toHaveBeenCalledWith("scheduled", null, { mode: "full" });
  });

  it("passes mode=quick through", async () => {
    runCollectJobMock.mockResolvedValue({ ok: true, collectedCount: 0 });
    runEmbedJobMock.mockResolvedValue({ processed_notices: 0, embedded_chunks: 0 });
    const res = await POST(makeRequest("secret", "?mode=quick"));
    expect(res.status).toBe(200);
    expect(runCollectJobMock).toHaveBeenCalledWith("scheduled", null, { mode: "quick" });
  });

  it("400 INVALID_MODE for an unknown mode, without running anything; auth is checked first", async () => {
    const res = await POST(makeRequest("secret", "?mode=bad"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_MODE" });
    expect(runCollectJobMock).not.toHaveBeenCalled();
    expect((await POST(makeRequest(undefined, "?mode=bad"))).status).toBe(401);
  });

  it("quick/full reject x-backfill-secret alone", async () => {
    process.env.BACKFILL_SECRET = "bf";
    const req = new Request("http://localhost/api/jobs/collect?mode=quick", {
      method: "POST",
      headers: { "x-backfill-secret": "bf" },
    });
    expect((await POST(req)).status).toBe(401);
    expect(runCollectJobMock).not.toHaveBeenCalled();
  });

  it("200 skipped (no embed call) when another collect run is already in progress", async () => {
    runCollectJobMock.mockResolvedValue({ ok: false, reason: "ALREADY_RUNNING", errorSummary: "ALREADY_RUNNING" });
    const res = await POST(makeRequest("secret", "?mode=quick"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mode: "quick", skipped: true, reason: "ALREADY_RUNNING" });
    expect(runEmbedJobMock).not.toHaveBeenCalled();
  });

  it("does not call runEmbedJob and returns an error when collect fails", async () => {
    runCollectJobMock.mockResolvedValue({ ok: false, reason: "ROBOTS_DISALLOWED", errorSummary: "x" });

    const res = await POST(makeRequest("secret"));
    expect(res.status).toBe(409);
    expect(runEmbedJobMock).not.toHaveBeenCalled();
  });

  it("still returns success when the embed job throws (embed failure does not fail collect)", async () => {
    runCollectJobMock.mockResolvedValue({ ok: true, collectedCount: 1 });
    runEmbedJobMock.mockRejectedValue(new Error("gemini down"));

    const res = await POST(makeRequest("secret"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { collected_count: number };
    expect(json.collected_count).toBe(1);
  });

  describe("mode=backfill", () => {
    function bf(query: string, headers: Record<string, string>) {
      return new Request(`http://localhost/api/jobs/collect?mode=backfill${query}`, { method: "POST", headers });
    }
    const ok = { "x-backfill-secret": "bf" };

    beforeEach(() => {
      process.env.BACKFILL_SECRET = "bf";
      runCollectJobMock.mockResolvedValue({ ok: true, collectedCount: 7 });
      countUnembeddedMock.mockResolvedValue(0);
    });

    it("401 when BACKFILL_SECRET is empty/unset, whatever header is sent", async () => {
      process.env.BACKFILL_SECRET = "";
      expect((await POST(bf("&from=1&to=2", { "x-backfill-secret": "" }))).status).toBe(401);
      delete process.env.BACKFILL_SECRET;
      expect((await POST(bf("&from=1&to=2", ok))).status).toBe(401);
      expect(runCollectJobMock).not.toHaveBeenCalled();
    });

    it("401 for wrong/missing x-backfill-secret and for scheduler secret alone", async () => {
      expect((await POST(bf("&from=1&to=2", { "x-backfill-secret": "nope" }))).status).toBe(401);
      expect((await POST(bf("&from=1&to=2", {}))).status).toBe(401);
      expect((await POST(bf("&from=1&to=2", { "x-scheduler-secret": "secret" }))).status).toBe(401);
      expect(runCollectJobMock).not.toHaveBeenCalled();
    });

    it("200 with the right secret, skipExisting fixed, response has collected_count and remaining_unembedded", async () => {
      runEmbedJobMock.mockResolvedValue({ processed_notices: 0, embedded_chunks: 0 });
      countUnembeddedMock.mockResolvedValue(4);
      const res = await POST(bf("&from=1&to=5", ok));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ mode: "backfill", collected_count: 7, remaining_unembedded: 4 });
      expect(runCollectJobMock).toHaveBeenCalledWith("scheduled", null, {
        mode: "backfill",
        fromPage: 1,
        toPage: 5,
        skipExisting: true,
      });
    });

    it.each([
      "",
      "&from=1",
      "&to=2",
      "&from=a&to=2",
      "&from=1.5&to=2",
      "&from=0&to=2",
      "&from=1&to=48",
      "&from=3&to=2",
      "&from=1&to=6",
    ])("400 INVALID_RANGE for %s, no collect; auth failure stays 401", async (q) => {
      const res = await POST(bf(q, ok));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "INVALID_RANGE" });
      expect(runCollectJobMock).not.toHaveBeenCalled();
      expect((await POST(bf(q, {}))).status).toBe(401);
    });

    it.each(["&from=1&to=5", "&from=46&to=47", "&from=3&to=3"])("accepts boundary range %s", async (q) => {
      runEmbedJobMock.mockResolvedValue({ processed_notices: 0, embedded_chunks: 0 });
      expect((await POST(bf(q, ok))).status).toBe(200);
    });

    it("200 skipped on overlap, no embed call", async () => {
      runCollectJobMock.mockResolvedValue({ ok: false, reason: "ALREADY_RUNNING", errorSummary: "x" });
      const res = await POST(bf("&from=1&to=2", ok));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ mode: "backfill", skipped: true, reason: "ALREADY_RUNNING" });
      expect(runEmbedJobMock).not.toHaveBeenCalled();
    });

    it("stops embedding once the queue is empty (embedded_chunks === 0)", async () => {
      runEmbedJobMock
        .mockResolvedValueOnce({ processed_notices: 15, embedded_chunks: 15 })
        .mockResolvedValueOnce({ processed_notices: 0, embedded_chunks: 0 });
      await POST(bf("&from=1&to=2", ok));
      expect(runEmbedJobMock).toHaveBeenCalledTimes(2);
    });

    it("stops starting new embed rounds after the 200s budget", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      runEmbedJobMock.mockImplementation(async () => {
        vi.setSystemTime(Date.now() + 80_000);
        return { processed_notices: 15, embedded_chunks: 15 };
      });
      await POST(bf("&from=1&to=2", ok));
      expect(runEmbedJobMock).toHaveBeenCalledTimes(3); // 0s, 80s, 160s start; 240s does not
    });

    it("embed throwing still returns 200 with collected_count", async () => {
      runEmbedJobMock.mockRejectedValue(new Error("gemini down"));
      const res = await POST(bf("&from=1&to=2", ok));
      expect(res.status).toBe(200);
      expect(((await res.json()) as { collected_count: number }).collected_count).toBe(7);
    });
  });
});
