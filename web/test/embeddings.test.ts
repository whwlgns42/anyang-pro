import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));

const { embedText, embedBatch } = await import("@/lib/embeddings");

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("embedText", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    queryMock.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
    vi.useRealTimers();
  });

  it("returns embedding and logs success to api_usage_logs", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { embedding: { values: [0.1, 0.2, 0.3] } }));

    const result = await embedText("hello");
    expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(result.model).toBe("gemini-embedding-001");

    const logCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into api_usage_logs"));
    expect(logCall).toBeDefined();
    expect(logCall?.[1]).toEqual(["gemini", "embedding", "success", null, null]);
  });

  it("retries on 429 then succeeds, and logs success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { error: "rate limited" }))
      .mockResolvedValueOnce(jsonResponse(200, { embedding: { values: [1, 2] } }));
    global.fetch = fetchMock;

    const promise = embedText("retry me");
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result.embedding).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries on repeated 429 and logs rate_limited", async () => {
    global.fetch = vi.fn().mockImplementation(async () => jsonResponse(429, {}));

    const promise = embedText("always limited");
    const assertion = expect(promise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000);
    await assertion;

    const logCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into api_usage_logs"));
    expect(logCall?.[1]).toEqual(["gemini", "embedding", "rate_limited", null, null]);
  });

  it("does not retry on non-retryable errors (e.g. 400)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(400, {}));
    global.fetch = fetchMock;

    await expect(embedText("bad request")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("embedBatch", () => {
  beforeEach(() => {
    queryMock.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("calls embedText sequentially for each text", async () => {
    global.fetch = vi.fn().mockImplementation(async () => jsonResponse(200, { embedding: { values: [0, 0] } }));

    const results = await embedBatch(["a", "b", "c"]);
    expect(results).toHaveLength(3);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
