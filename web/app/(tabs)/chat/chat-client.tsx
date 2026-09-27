"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../_lib/api-fetch";
import { ChatSseParser, type Citation } from "../../_lib/chat-stream";

type Message = { role: "user" | "assistant"; content: string; citations?: Citation[] };
type StoredMessage = { role: "user" | "assistant" | string; content: string };

// anyang-frontend-screens 3절 "인용 공지 카드"(확인 항목 22 반영, 설계 승인 2026-09-28).
// event: citations 블록을 anyang-backend-api 3-2절 계약대로 파싱해 AI 말풍선 위에 카드로
// 표시한다. 빈 배열이면 카드 행 자체를 그리지 않는다. 대화 히스토리 목록 진입점(8절)은
// 상단 링크로, ?conversation_id=...로 들어오면 GET /api/conversations/:id/messages로 과거
// 메시지를 불러와 이어서 연다.
export function ChatClient({ initialConversationId }: { initialConversationId: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(initialConversationId);

  useEffect(() => {
    if (!initialConversationId) return;
    apiFetch(`/api/conversations/${initialConversationId}/messages`).then(async (res) => {
      if (!res.ok) return;
      const history = (await res.json()) as StoredMessage[];
      setMessages(
        history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    const res = await apiFetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: text,
        conversation_id: conversationIdRef.current,
      }),
    });

    if (!res.ok || !res.body) {
      setSending(false);
      if (res.status !== 403) {
        setError("응답을 받아오지 못했습니다.");
      }
      return;
    }

    const convId = res.headers.get("x-conversation-id");
    if (convId) conversationIdRef.current = convId;

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const parser = new ChatSseParser();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const event = parser.parseLine(line);
        if (!event) continue;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (event.type === "citations") {
            next[next.length - 1] = { ...last, citations: event.items };
          } else {
            next[next.length - 1] = { ...last, content: last.content + event.content };
          }
          return next;
        });
      }
    }
    setSending(false);
  }

  return (
    <main className="page" style={{ display: "flex", flexDirection: "column" }}>
      <div className="chat-header">
        <h1>채팅</h1>
        <Link href="/conversations">대화 목록</Link>
      </div>
      <div className="chat-log" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div className={`chat-turn chat-turn--${m.role}`} key={i}>
            {m.role === "assistant" && m.citations && m.citations.length > 0 && (
              <div className="citation-row">
                <p className="hint-text">관련 공지</p>
                {m.citations.map((c) => (
                  <Link key={c.id} href={`/notices/${c.id}`} className="card citation-card">
                    <strong>{c.title}</strong>
                    <p>{c.posted_at ? new Date(c.posted_at).toLocaleDateString() : "-"}</p>
                  </Link>
                ))}
              </div>
            )}
            <div className={`bubble bubble--${m.role}`}>{m.content}</div>
          </div>
        ))}
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleSend} className="chat-input-row">
        <label htmlFor="chat-input" className="visually-hidden" style={{ display: "none" }}>
          메시지 입력
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          전송
        </button>
      </form>
    </main>
  );
}
