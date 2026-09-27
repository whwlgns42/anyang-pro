import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const queryMock = vi.fn();
const embedBatchMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/embeddings", () => ({
  embedBatch: (...args: unknown[]) => embedBatchMock(...args),
  EMBED_BATCH_SIZE: 15,
}));

const { POST, splitIntoChunks } = await import("@/app/api/jobs/embed/route");

function makeRequest(secret?: string) {
  return new Request("http://localhost/api/jobs/embed", {
    method: "POST",
    headers: secret ? { "x-scheduler-secret": secret } : {},
  });
}

describe("splitIntoChunks", () => {
  it("returns a single chunk for short bodies", () => {
    expect(splitIntoChunks("짧은 본문")).toEqual(["짧은 본문"]);
  });

  it("splits long bodies into multiple chunks", () => {
    const body = "a".repeat(3200);
    const chunks = splitIntoChunks(body);
    expect(chunks.length).toBe(3);
    expect(chunks.join("")).toBe(body);
  });
});

describe("POST /api/jobs/embed", () => {
  const original = process.env.SCHEDULER_SHARED_SECRET;

  beforeEach(() => {
    queryMock.mockReset();
    embedBatchMock.mockReset();
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

  it("embeds notices missing notice_chunks and inserts chunk rows", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("not exists")) {
        return { rows: [{ id: "notice-1", body: "짧은 공지 본문" }] };
      }
      return { rows: [] };
    });
    embedBatchMock.mockResolvedValue([{ embedding: [0.1, 0.2], model: "gemini-embedding-001" }]);

    const res = await POST(makeRequest("secret"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { processed_notices: number; embedded_chunks: number };
    expect(json.processed_notices).toBe(1);
    expect(json.embedded_chunks).toBe(1);

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into notice_chunks"));
    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toEqual(["notice-1", "짧은 공지 본문", JSON.stringify([0.1, 0.2]), "gemini-embedding-001"]);
  });

  it("does nothing when no notices are pending", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const res = await POST(makeRequest("secret"));
    const json = (await res.json()) as { processed_notices: number };
    expect(json.processed_notices).toBe(0);
    expect(embedBatchMock).not.toHaveBeenCalled();
  });
});
