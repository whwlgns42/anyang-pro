// anyang-frontend-screens 3절 "채팅 화면" / anyang-backend-api 3-2절 SSE 계약.
// event: 필드 유무로 분기: event: citations 블록은 인용 공지 배열, 그 외 data:만 있는 줄은
// 기존 DeepSeek OpenAI 호환 델타로 본다. 순수 함수/클래스로 분리해 브라우저 fetch 없이 테스트한다.

export type Citation = {
  id: string;
  title: string;
  source_url: string;
  posted_at: string | null;
};

export type ChatStreamEvent =
  | { type: "delta"; content: string }
  | { type: "citations"; items: Citation[] };

export class ChatSseParser {
  private currentEvent: string | null = null;

  // SSE는 빈 줄로 이벤트 블록이 끝난다(스펙) — event: 필드는 다음 빈 줄까지만 적용된다.
  parseLine(line: string): ChatStreamEvent | null {
    const trimmed = line.trim();
    if (trimmed === "") {
      this.currentEvent = null;
      return null;
    }
    if (trimmed.startsWith("event:")) {
      this.currentEvent = trimmed.slice(6).trim();
      return null;
    }
    if (!trimmed.startsWith("data:")) return null;
    const payload = trimmed.slice(5).trim();

    if (this.currentEvent === "citations") {
      try {
        const items = JSON.parse(payload) as Citation[];
        return { type: "citations", items };
      } catch {
        return null;
      }
    }

    if (payload === "[DONE]") return null;
    try {
      const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
      const delta = json.choices?.[0]?.delta?.content;
      return delta ? { type: "delta", content: delta } : null;
    } catch {
      return null;
    }
  }
}
