import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({ pool: { query: (...args: unknown[]) => queryMock(...args) } }));

const { extractPreferences } = await import("@/lib/deepseek");

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function chatContent(content: string): unknown {
  return { choices: [{ message: { content } }] };
}

// anyang-backend-api 3-3-1절 — extractPreferences: JSON 배열 출력·코드펜스 제거 후 파싱,
// 실패 시 빈 배열. 함수 자체는 매 답변마다 호출되며 게이트가 없다(3절 5번).
describe("extractPreferences", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;

  beforeEach(() => {
    queryMock.mockReset();
    process.env.DEEPSEEK_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.DEEPSEEK_API_KEY = originalKey;
  });

  it("parses a plain JSON array response", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, chatContent('["이름은 홍길동", "IT 직군"]')));

    const result = await extractPreferences("사용자: 안녕\n어시스턴트: 반갑습니다", []);
    expect(result).toEqual(["이름은 홍길동", "IT 직군"]);
  });

  it("strips a markdown code fence before parsing", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, chatContent('```json\n["새 사실"]\n```')));

    const result = await extractPreferences("대화", []);
    expect(result).toEqual(["새 사실"]);
  });

  it("returns an empty array when the model returns an empty array", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, chatContent("[]")));

    const result = await extractPreferences("대화", []);
    expect(result).toEqual([]);
  });

  it("returns an empty array on malformed JSON instead of throwing", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, chatContent("이건 JSON이 아님")));

    const result = await extractPreferences("대화", []);
    expect(result).toEqual([]);
  });

  it("returns an empty array when the parsed value is not an array", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, chatContent('{"fact": "홍길동"}')));

    const result = await extractPreferences("대화", []);
    expect(result).toEqual([]);
  });

  it("includes the known-facts list in the request payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, chatContent("[]")));
    global.fetch = fetchMock;

    await extractPreferences("사용자: 안녕", ["이미 아는 사실 A"]);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    const userMessage = body.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("이미 아는 사실 A");
    expect(userMessage).toContain("사용자: 안녕");
  });

  it("propagates a fetch failure (caller decides how to handle it)", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(500, {}));

    await expect(extractPreferences("대화", [])).rejects.toThrow();
  });
});
