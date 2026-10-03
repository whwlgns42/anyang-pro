import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const runCollectJobMock = vi.fn();
const runEmbedJobMock = vi.fn();

vi.mock("@/lib/collector", () => ({ runCollectJob: (...args: unknown[]) => runCollectJobMock(...args) }));
vi.mock("@/lib/embed-job", () => ({ runEmbedJob: (...args: unknown[]) => runEmbedJobMock(...args) }));

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
    process.env.SCHEDULER_SHARED_SECRET = "secret";
  });

  afterEach(() => {
    process.env.SCHEDULER_SHARED_SECRET = original;
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
    const res = await POST(makeRequest("secret", "?mode=backfill"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_MODE" });
    expect(runCollectJobMock).not.toHaveBeenCalled();
    expect((await POST(makeRequest(undefined, "?mode=bad"))).status).toBe(401);
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
});
