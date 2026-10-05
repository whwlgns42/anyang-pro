import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
const authMock = vi.fn();
const embedTextMock = vi.fn();
const streamDeepSeekChatMock = vi.fn();
const extractPreferencesMock = vi.fn();
const claimChatSlotMock = vi.fn();

vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/embeddings", () => ({ embedText: (...args: unknown[]) => embedTextMock(...args) }));
vi.mock("@/lib/auth-attempts", () => ({ claimChatSlot: (...args: unknown[]) => claimChatSlotMock(...args) }));
vi.mock("@/lib/deepseek", () => ({
  streamDeepSeekChat: (...args: unknown[]) => streamDeepSeekChatMock(...args),
  extractPreferences: (...args: unknown[]) => extractPreferencesMock(...args),
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
    if (text.includes("select n.id, n.title")) return { rows: [] };
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

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    queryMock.mockReset();
    authMock.mockReset();
    embedTextMock.mockReset();
    streamDeepSeekChatMock.mockReset();
    extractPreferencesMock.mockReset();
    claimChatSlotMock.mockReset();
    claimChatSlotMock.mockResolvedValue({ ok: true });
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
  });

  // anyang-backend-api 3-4절(확인 항목 63) — 길이·제한·이력·502 정리
  const sqlCalls = () => queryMock.mock.calls.map(([sql]) => String(sql));
  const happyMocks = () => {
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));
  };

  it("length: 2000 chars pass, 2001 get 400 MESSAGE_TOO_LONG before the slot is claimed", async () => {
    mockAuthenticatedQueries();
    happyMocks();
    expect((await POST(makeRequest({ message: "가".repeat(2000) }))).status).toBe(200);
    claimChatSlotMock.mockClear();
    const res = await POST(makeRequest({ message: "가".repeat(2001) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "MESSAGE_TOO_LONG", max_length: 2000 });
    expect(claimChatSlotMock).not.toHaveBeenCalled();
  });

  it("length: counts code points (2000 emoji pass, 2001 fail), ignores surrounding spaces", async () => {
    mockAuthenticatedQueries();
    happyMocks();
    expect((await POST(makeRequest({ message: "😀".repeat(2000) }))).status).toBe(200);
    happyMocks();
    expect((await POST(makeRequest({ message: "😀".repeat(2001) }))).status).toBe(400);
    happyMocks();
    expect((await POST(makeRequest({ message: `  ${"a".repeat(2000)}  ` }))).status).toBe(200);
  });

  it("429 with limit when the slot is refused; nothing is written or called", async () => {
    mockAuthenticatedQueries();
    claimChatSlotMock.mockResolvedValue({ ok: false, limit: "day" });
    const res = await POST(makeRequest({ message: "안녕" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "TOO_MANY_ATTEMPTS", limit: "day" });
    expect(sqlCalls().some((s) => s.includes("insert into conversations") || s.includes("insert into messages"))).toBe(false);
    expect(embedTextMock).not.toHaveBeenCalled();
    expect(streamDeepSeekChatMock).not.toHaveBeenCalled();
  });

  it("an over-limit user sending 2001 chars gets 400, not 429", async () => {
    mockAuthenticatedQueries();
    claimChatSlotMock.mockResolvedValue({ ok: false, limit: "minute" });
    expect((await POST(makeRequest({ message: "a".repeat(2001) }))).status).toBe(400);
  });

  it("slot failure surfaces as an exception (not let through)", async () => {
    mockAuthenticatedQueries();
    claimChatSlotMock.mockRejectedValue(new Error("db down"));
    await expect(POST(makeRequest({ message: "안녕" }))).rejects.toThrow("db down");
  });

  it("502 on embedding failure deletes the conversation created by this request, no x-conversation-id", async () => {
    mockAuthenticatedQueries();
    embedTextMock.mockRejectedValue(new Error("boom"));
    const res = await POST(makeRequest({ message: "안녕" }));
    expect(res.status).toBe(502);
    expect(res.headers.get("x-conversation-id")).toBeNull();
    const del = queryMock.mock.calls.find(([s]) => String(s).includes("delete from conversations"));
    expect(del?.[1]).toEqual(["conv-1", "u1"]);
    expect(sqlCalls().some((s) => s.includes("delete from messages"))).toBe(false);
  });

  it("502 on DeepSeek failure in an existing conversation deletes only this user message", async () => {
    mockAuthenticatedQueries((text) => {
      if (text.includes("select id from conversations")) return [{ id: "c9" }];
      if (text.includes("insert into messages")) return [{ id: "m-new" }];
      return undefined;
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockRejectedValue(new Error("boom"));
    const res = await POST(makeRequest({ conversation_id: "c9", message: "안녕" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "CHAT_FAILED" });
    const del = queryMock.mock.calls.find(([s]) => String(s).includes("delete from messages"));
    expect(del?.[1]).toEqual(["m-new"]);
    expect(sqlCalls().some((s) => s.includes("delete from conversations"))).toBe(false);
  });

  it("a failing cleanup delete does not change the 502", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("delete from")) throw new Error("cleanup boom");
      if (text.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (text.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (text.includes("insert into conversations")) return { rows: [{ id: "conv-1" }] };
      return { rows: [] };
    });
    embedTextMock.mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await POST(makeRequest({ message: "안녕" }));
    spy.mockRestore();
    expect(res.status).toBe(502);
  });

  it("history: queries newest 20 desc, reverses to chronological, drops leading assistant rows", async () => {
    const desc = [
      { role: "user", content: "u2" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "u1" },
      { role: "assistant", content: "a0" },
    ];
    mockAuthenticatedQueries((text) => (text.includes("select role, content from messages") ? [...desc] : undefined));
    happyMocks();
    await POST(makeRequest({ message: "u2" }));
    const call = queryMock.mock.calls.find(([s]) => String(s).includes("select role, content from messages"));
    expect(String(call?.[0])).toContain("order by created_at desc limit $2");
    expect(call?.[1]).toEqual(["conv-1", 20]);
    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ role: string; content: string }[]];
    expect(chatMessages.slice(1).map((m) => m.content)).toEqual(["u1", "a1", "u2"]);
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

  it("sends age band instead of raw birth_year to DeepSeek (item 28)", async () => {
    mockAuthenticatedQueries((text) => {
      if (text.includes("select birth_year")) {
        return [{ birth_year: 1900, gender: "male", occupation_type: "it", enrollment_status: "employed" }];
      }
      return undefined;
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "안녕" }));
    expect(res.status).toBe(200);

    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ content: string }[]];
    const combined = chatMessages.map((m) => m.content).join("\n");
    expect(combined).toContain("40세 이상");
    expect(combined).not.toMatch(/1900/);
  });

  it("omits age band condition when birth_year is null (item 28)", async () => {
    mockAuthenticatedQueries((text) => {
      if (text.includes("select birth_year")) {
        return [{ birth_year: null, gender: null, occupation_type: null, enrollment_status: null }];
      }
      return undefined;
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "안녕" }));
    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ content: string }[]];
    expect(chatMessages[0].content).not.toContain("나이대");
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

  it("sends citations event with data: [] before DeepSeek chunks when no notices match", async () => {
    mockAuthenticatedQueries();
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(
      new Response(makeSseStream(['data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n', "data: [DONE]\n\n"])),
    );

    const res = await POST(makeRequest({ message: "안녕" }));
    const text = await readAll(res.body!);
    expect(text.startsWith("event: citations\ndata: []\n\n")).toBe(true);
    expect(text.indexOf("event: citations")).toBeLessThan(text.indexOf('"choices"'));
  });

  it("dedupes citations by notice_id, keeping the first (most similar) occurrence, excludes hidden notices via query", async () => {
    mockAuthenticatedQueries((text) => {
      if (text.includes("select n.id, n.title")) {
        expect(text).toContain("hidden_at is null");
        return [
          { id: "n1", title: "공지1", source_url: "https://a", published_at: "2026-01-01", chunk_text: "본문1" },
          { id: "n1", title: "공지1", source_url: "https://a", published_at: "2026-01-01", chunk_text: "본문1-2" },
          { id: "n2", title: "공지2", source_url: "https://b", published_at: null, chunk_text: "본문2" },
        ];
      }
      return undefined;
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "안녕" }));
    const text = await readAll(res.body!);
    const citationsLine = text.split("\n\n")[0];
    const json = JSON.parse(citationsLine.replace("event: citations\ndata: ", ""));
    expect(json).toEqual([
      { id: "n1", title: "공지1", source_url: "https://a", posted_at: "2026-01-01" },
      { id: "n2", title: "공지2", source_url: "https://b", posted_at: null },
    ]);
  });

  it("injects '기억하는 사용자 정보:' section when user_preferences exist (item 43)", async () => {
    mockAuthenticatedQueries((text) => {
      if (text.includes("select id, preference_text, updated_at")) {
        return [{ id: "p1", preference_text: "이름은 홍길동" }];
      }
      return undefined;
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "안녕" }));
    expect(res.status).toBe(200);
    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ content: string }[]];
    expect(chatMessages[0].content).toContain("기억하는 사용자 정보:");
    expect(chatMessages[0].content).toContain("- 이름은 홍길동");
  });

  it("omits the memory section header entirely when there are no memories (item 43)", async () => {
    mockAuthenticatedQueries();
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "안녕" }));
    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ content: string }[]];
    expect(chatMessages[0].content).not.toContain("기억하는 사용자 정보:");
  });

  it("caps combined recent+similar memories at 10 with no duplicates (item 43)", async () => {
    const recentRows = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, preference_text: `최근${i}` }));
    const similarRows = [
      ...Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, preference_text: `유사${i}` })),
      { id: "r0", preference_text: "최근0" }, // 최근 목록과 중복되는 id
    ];
    mockAuthenticatedQueries((text) => {
      if (text.includes("select id, preference_text, updated_at")) return recentRows;
      if (text.includes("select id, preference_text, embedding <=>")) return similarRows;
      return undefined;
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "안녕" }));
    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ content: string }[]];
    const memoryLines = chatMessages[0].content
      .split("\n")
      .filter((l) => l.startsWith("- 최근") || l.startsWith("- 유사"));
    expect(memoryLines.length).toBe(10);
  });

  it("falls back to recent memories only when the similar-memory query fails (item 43)", async () => {
    mockAuthenticatedQueries((text) => {
      if (text.includes("select id, preference_text, updated_at")) {
        return [{ id: "r1", preference_text: "최근 기억" }];
      }
      return undefined;
    });
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("select id, preference_text, embedding <=>")) throw new Error("boom");
      if (text.includes("select id, preference_text, updated_at")) {
        return { rows: [{ id: "r1", preference_text: "최근 기억" }] };
      }
      if (text.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (text.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (text.includes("insert into conversations")) return { rows: [{ id: "conv-1" }] };
      if (text.includes("select embedding from user_preferences")) return { rows: [] };
      if (text.includes("select n.id, n.title")) return { rows: [] };
      if (text.includes("select birth_year")) return { rows: [] };
      if (text.includes("select role, content from messages")) return { rows: [] };
      return { rows: [] };
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "안녕" }));
    expect(res.status).toBe(200);
    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ content: string }[]];
    expect(chatMessages[0].content).toContain("- 최근 기억");
  });

  it("skips the memory section (not a 502) when the recent-memory query fails (item 43)", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.includes("select id, preference_text, updated_at")) throw new Error("boom");
      if (text.includes("suspended_at")) return { rows: [{ suspended_at: null }] };
      if (text.includes("policy_version")) return { rows: [{ policy_version: "2026-09-27" }] };
      if (text.includes("insert into conversations")) return { rows: [{ id: "conv-1" }] };
      if (text.includes("select embedding from user_preferences")) return { rows: [] };
      if (text.includes("select n.id, n.title")) return { rows: [] };
      if (text.includes("select birth_year")) return { rows: [] };
      if (text.includes("select role, content from messages")) return { rows: [] };
      return { rows: [] };
    });
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    streamDeepSeekChatMock.mockResolvedValue(new Response(makeSseStream(["data: [DONE]\n\n"])));

    const res = await POST(makeRequest({ message: "안녕" }));
    expect(res.status).toBe(200);
    const [chatMessages] = streamDeepSeekChatMock.mock.calls[0] as [{ content: string }[]];
    expect(chatMessages[0].content).not.toContain("기억하는 사용자 정보:");
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
    extractPreferencesMock.mockReset();
    embedTextMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
    extractPreferencesMock.mockResolvedValue([]);
  });

  it("assembles delta chunks into the full assistant text and stores it", async () => {
    const stream = makeSseStream([
      'data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"하세요"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    await consumeAndStore(stream, "conv-1", "u1", "질문", []);

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into messages"));
    expect(insertCall?.[1]).toEqual(["conv-1", "안녕하세요"]);
  });

  it("does not insert a message when the stream produces no content", async () => {
    const stream = makeSseStream(["data: [DONE]\n\n"]);

    await consumeAndStore(stream, "conv-1", "u1", "질문", []);

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into messages"));
    expect(insertCall).toBeUndefined();
  });

  it("rejects on a deleted conversation (messages FK violation) and never extracts preferences", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("insert into messages")) {
        throw Object.assign(new Error("violates foreign key constraint"), { code: "23503" });
      }
      return { rows: [] };
    });
    const stream = makeSseStream(['data: {"choices":[{"delta":{"content":"응답"}}]}\n\n', "data: [DONE]\n\n"]);

    await expect(consumeAndStore(stream, "deleted-conv", "u1", "질문", [])).rejects.toMatchObject({ code: "23503" });
    expect(extractPreferencesMock).not.toHaveBeenCalled();
  });

  it("extracts preferences on every call, regardless of message count (item 43, removes the 6-message gate)", async () => {
    const stream = makeSseStream(['data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n', "data: [DONE]\n\n"]);

    await consumeAndStore(stream, "conv-1", "u1", "질문", [{ id: "m1", preference_text: "이미 아는 사실" }]);

    expect(extractPreferencesMock).toHaveBeenCalledTimes(1);
    const [conversationText, knownFacts] = extractPreferencesMock.mock.calls[0] as [string, string[]];
    expect(conversationText).toContain("질문");
    expect(conversationText).toContain("안녕");
    expect(knownFacts).toEqual(["이미 아는 사실"]);
  });

  it("stores a name fact unmasked, but masks a phone number within the same fact", async () => {
    extractPreferencesMock.mockResolvedValue([
      { fact: "사용자 이름은 홍길동, 연락처는 010-1234-5678", replaces: null },
    ]);
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.startsWith("update user_preferences")) return { rows: [] }; // 갱신 대상 없음 → INSERT로 폴백
      return { rows: [] };
    });
    const stream = makeSseStream(['data: {"choices":[{"delta":{"content":"응답"}}]}\n\n', "data: [DONE]\n\n"]);

    await consumeAndStore(stream, "conv-1", "u1", "질문", []);

    const insertPrefCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into user_preferences"));
    const storedText = (insertPrefCall?.[1] as unknown[])[1] as string;
    expect(storedText).toContain("홍길동");
    expect(storedText).not.toMatch(/010-1234-5678/);
    expect(storedText).toContain("[전화번호]");
  });

  it("does not add a row when extraction returns an empty array", async () => {
    extractPreferencesMock.mockResolvedValue([]);
    const stream = makeSseStream(['data: {"choices":[{"delta":{"content":"응답"}}]}\n\n', "data: [DONE]\n\n"]);

    await consumeAndStore(stream, "conv-1", "u1", "질문", []);

    expect(embedTextMock).not.toHaveBeenCalled();
    const insertPrefCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into user_preferences"));
    expect(insertPrefCall).toBeUndefined();
  });

  it("treats a malformed extraction result as an empty array without failing the chat", async () => {
    extractPreferencesMock.mockRejectedValue(new Error("bad json"));
    const stream = makeSseStream(['data: {"choices":[{"delta":{"content":"응답"}}]}\n\n', "data: [DONE]\n\n"]);

    await expect(consumeAndStore(stream, "conv-1", "u1", "질문", [])).resolves.toBeUndefined();
    expect(embedTextMock).not.toHaveBeenCalled();
  });

  it("updates the existing row instead of inserting when a near-duplicate fact is returned", async () => {
    extractPreferencesMock.mockResolvedValue([{ fact: "이미 아는 사실과 같은 내용", replaces: null }]);
    embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
    queryMock.mockImplementation(async (sql: string) => {
      const text = String(sql);
      if (text.startsWith("update user_preferences")) return { rows: [{ id: "existing-1" }] }; // 임계값 안 → 갱신
      return { rows: [] };
    });
    const stream = makeSseStream(['data: {"choices":[{"delta":{"content":"응답"}}]}\n\n', "data: [DONE]\n\n"]);

    await consumeAndStore(stream, "conv-1", "u1", "질문", [
      { id: "m1", preference_text: "이미 아는 사실과 같은 내용" },
    ]);

    const insertPrefCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into user_preferences"));
    expect(insertPrefCall).toBeUndefined(); // UPDATE가 행을 반환했으므로 INSERT하지 않는다
  });

  describe("contradiction replace (3-3-4)", () => {
    const mems = [
      { id: "m1", preference_text: "취업 준비 중" },
      { id: "m2", preference_text: "축구를 좋아한다" },
    ];
    const run = (facts: unknown, handler?: (text: string) => { rows: unknown[] } | undefined) => {
      extractPreferencesMock.mockResolvedValue(facts);
      embedTextMock.mockResolvedValue({ embedding: [0.1, 0.2], model: "gemini-embedding-001" });
      queryMock.mockImplementation(async (sql: string) => handler?.(String(sql)) ?? { rows: [] });
      const stream = makeSseStream(['data: {"choices":[{"delta":{"content":"응답"}}]}\n\n', "data: [DONE]\n\n"]);
      return consumeAndStore(stream, "conv-1", "u1", "질문", mems);
    };
    const prefSql = () =>
      queryMock.mock.calls.map(([sql]) => String(sql)).filter((t) => t.includes("update user_preferences") || t.includes("insert into user_preferences"));
    const replaceCall = () => queryMock.mock.calls.find(([sql]) => String(sql).includes("previous_fact"));

    it("replaces the same row via one update with user_id and no insert", async () => {
      await run([{ fact: "회사에 다닌다", replaces: 1 }], (t) => (t.includes("previous_fact") ? { rows: [{ id: "m1" }] } : undefined));

      const call = replaceCall();
      expect(call?.[1]).toEqual(["m1", "u1", "회사에 다닌다", JSON.stringify([0.1, 0.2]), "gemini-embedding-001", "conv-1"]);
      expect(String(call?.[0])).toContain("where id = $1 and user_id = $2");
      expect(prefSql()).toHaveLength(1); // 유사 갱신·INSERT 없음
    });

    it("falls through to similar-update then insert when the replace hits 0 rows", async () => {
      await run([{ fact: "회사에 다닌다", replaces: 2 }]);

      expect(replaceCall()?.[1]).toEqual(expect.arrayContaining(["m2", "u1"]));
      expect(queryMock.mock.calls.some(([sql]) => String(sql).includes("insert into user_preferences"))).toBe(true);
    });

    it("does not touch previous_fact when replaces is null (similar update / insert)", async () => {
      await run([{ fact: "축구도 좋아한다", replaces: null }]);

      expect(replaceCall()).toBeUndefined();
      expect(prefSql().every((t) => !t.includes("previous_fact"))).toBe(true);
    });

    it("masks a phone number in the replacement sentence", async () => {
      await run([{ fact: "연락처는 010-1234-5678", replaces: 1 }], (t) => (t.includes("previous_fact") ? { rows: [{ id: "m1" }] } : undefined));

      expect(replaceCall()?.[1]?.[2]).toContain("[전화번호]");
    });

    it("skips only the failing sentence when the replace query throws", async () => {
      await run(
        [{ fact: "A", replaces: 1 }, { fact: "B", replaces: null }],
        (t) => {
          if (t.includes("previous_fact")) throw new Error("boom");
          return undefined;
        },
      );

      expect(queryMock.mock.calls.filter(([sql]) => String(sql).includes("insert into user_preferences"))).toHaveLength(1);
    });
  });

  it("stores the partial assistant text collected before a mid-stream exception (item 43-b)", async () => {
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n'),
        })
        .mockRejectedValueOnce(new Error("stream cancelled")),
    };
    const stream = { getReader: () => reader } as unknown as ReadableStream<Uint8Array>;

    await consumeAndStore(stream, "conv-1", "u1", "질문", []);

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into messages"));
    expect(insertCall?.[1]).toEqual(["conv-1", "안녕"]);
  });

  it("does not insert a message when the exception happens before any delta is received (item 43-b)", async () => {
    const reader = { read: vi.fn().mockRejectedValueOnce(new Error("stream cancelled")) };
    const stream = { getReader: () => reader } as unknown as ReadableStream<Uint8Array>;

    await consumeAndStore(stream, "conv-1", "u1", "질문", []);

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("insert into messages"));
    expect(insertCall).toBeUndefined();
  });
});
