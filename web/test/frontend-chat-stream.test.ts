import { describe, expect, it } from "vitest";
import { ChatSseParser } from "@/app/_lib/chat-stream";

describe("ChatSseParser", () => {
  it("parses a citations event block into citation items", () => {
    const parser = new ChatSseParser();
    expect(parser.parseLine("event: citations")).toBeNull();
    const event = parser.parseLine(
      'data: [{"id":"1","title":"청년 월세 지원","source_url":"https://example.com/1","posted_at":"2026-09-01"}]',
    );
    expect(event).toEqual({
      type: "citations",
      items: [
        { id: "1", title: "청년 월세 지원", source_url: "https://example.com/1", posted_at: "2026-09-01" },
      ],
    });
  });

  it("parses an empty citations array without dropping the event", () => {
    const parser = new ChatSseParser();
    parser.parseLine("event: citations");
    expect(parser.parseLine("data: []")).toEqual({ type: "citations", items: [] });
  });

  it("resets the event type after a blank line", () => {
    const parser = new ChatSseParser();
    parser.parseLine("event: citations");
    parser.parseLine("data: []");
    parser.parseLine("");
    // event: 없는 data:는 다시 DeepSeek 델타로 해석된다.
    const event = parser.parseLine('data: {"choices":[{"delta":{"content":"안녕"}}]}');
    expect(event).toEqual({ type: "delta", content: "안녕" });
  });

  it("parses plain data lines (no event field) as DeepSeek deltas", () => {
    const parser = new ChatSseParser();
    const event = parser.parseLine('data: {"choices":[{"delta":{"content":"토큰"}}]}');
    expect(event).toEqual({ type: "delta", content: "토큰" });
  });

  it("ignores [DONE] and non-JSON payloads", () => {
    const parser = new ChatSseParser();
    expect(parser.parseLine("data: [DONE]")).toBeNull();
    expect(parser.parseLine("data: not-json")).toBeNull();
  });

  it("ignores non data/event lines", () => {
    const parser = new ChatSseParser();
    expect(parser.parseLine(": comment")).toBeNull();
  });
});
