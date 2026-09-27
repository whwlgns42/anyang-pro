import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();
const embedTextMock = vi.fn();
const streamDeepSeekChatMock = vi.fn();
const summarizePreferenceMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/embeddings", () => ({ embedText: (...args: unknown[]) => embedTextMock(...args) }));
vi.mock("@/lib/deepseek", () => ({
  streamDeepSeekChat: (...args: unknown[]) => streamDeepSeekChatMock(...args),
  summarizePreference: (...args: unknown[]) => summarizePreferenceMock(...args),
}));

const { POST, consumeAndStore, buildQueryVector } = await import("@/app/api/chat/route");

function mockAuthenticatedQueries(extra: (sql: string) => unknown[] | undefined = () => undefined): void {
  queryMock.mockImplementation(async (sql: string) => {
    const text = String(sql);
    const extraRows = extra(text);
    if (extraRows) return { rows: extraRows };
    if (text.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
    if (text.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
    if (text.includes("insert into conversations")) return { rows: [{ id: "conv-1" }] };
    if (text.includes("select embedding from user_preferences")) return { rows: [] };
    if (text.includes("select n.title, nc.chunk_text")) return { rows: [] };
    if (text.includes("select birth_year")) return { rows: [] };
    if (text.includes("select role, content from messages")) return { rows: [] };
    return { rows: [] };
  });
}

function makeSseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify(body) }) as never;
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
    embedTextMock.mockReset();
    streamDeepSeekChatMock.mockReset();
    summarizePreferenceMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
  });

  it("400 on empty message", async () => {
    mockAuthenticatedQueries();
    const res = await POST(makeRequest({ message: "" }));
    expect(res.status).toBe(400);
  });

  it("sends masked payload to DeepSeek — no raw phone/email/rrn in any message content", async () => {
    mockAuthenticatedQueries((text) => {
      if (text.includes("select role, content from messages")) {
        return [{ role: "user", content: "제 번호는 010-1234-5678, 이메일 a@b.com 입니다" }];
      }
      return undefined;
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "제 번호는 010-1234-5678, 이메일 a@b.com 입니다" }));
    expect(res.status).toBe(200);

    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ content: string }[]];
    const combined = chatMessages.map((m) => m.content).join("\n");
    expect(combined).not.toMatch(/010-1234-5678/);
    expect(combined).not.toMatch(/a@b\.com/);
  });

  it("returns 502 when embedding fails", async () => {
    mockAuthenticatedQueries();
    embedTextMock.mockRejectedValue(new Error("EMBEDDING_NOT_CONNECTED"));

    const res = await POST(makeRequest({ message: "안녕" }));
    expect(res.status).toBe(502);
  });

  it("404 when conversation_id does not belong to user", async () => {
    mockAuthenticatedQueries((text) => {
      if (text.includes("select id from conversations")) return [];
      return undefined;
    });

    const res = await POST(makeRequest({ conversation_id: "other-conv", message: "안녕" }));
    expect(res.status).toBe(404);
  });
});

describe("buildQueryVector", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the message embedding unchanged when the user has no preferences", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const result = await buildQueryVector("u1", [1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("averages preference embeddings with the message embedding (0.5/0.5)", async () => {
    queryMock.mockResolvedValue({ rows: [{ embedding: JSON.stringify([2, 2]) }] });
    const result = await buildQueryVector("u1", [0, 0]);
    expect(result).toEqual([1, 1]);
  });
});

describe("consumeAndStore", () => {
  beforeEach(() => {
    queryMock.mockReset();
    summarizePreferenceMock.mockReset();
    embedTextMock.mockReset();
  });

  it("assembles delta chunks into the full assistant text and stores it", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("count(*)::text")) return { rows: [{ count: "1" }] };
      return { rows: [] };
    });

    const stream = makeSseStream([
      'data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"하세요"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    await consumeAndStore(stream, "conv-1", "u1");

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into messages"));
    expect(insertCall?.[1]).toEqual(["conv-1", "안녕하세요"]);
  });

  it("does not insert a message when the stream produces no content", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const stream = makeSseStream(["data: [DONE]\n\n"]);

    await consumeAndStore(stream, "conv-1", "u1");

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into messages"));
    expect(insertCall).toBeUndefined();
  });
});
