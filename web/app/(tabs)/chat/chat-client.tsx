"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../_lib/api-fetch";

type Message = { role: "user" | "assistant"; content: string };
type StoredMessage = { role: "user" | "assistant" | string; content: string };

// anyang-frontend-screens 3절. 공지 인용 카드는 만들지 않는다 — DeepSeek SSE 응답에는 인용
// 정보가 없고(원본 OpenAI 호환 델타만 옴), 별도 API 없이는 어떤 청크가 어느 공지를 가리키는지
// 알 수 없다(backend와 조율 필요, 보고에 기록 — 22번 확인 항목, backend-api 재승인 대기).
// 대화 히스토리 목록 진입점(8절)은 상단 링크로, ?conversation_id=...로 들어오면
// GET /api/conversations/:id/messages로 과거 메시지를 불러와 이어서 연다.
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
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "assistant",
                content: next[next.length - 1].content + delta,
              };
              return next;
            });
          }
        } catch {
          // 부분/비-JSON 청크는 무시.
        }
      }
    }
    setSending(false);
  }

  return (
    <main className="page" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>채팅</h1>
        <Link href="/conversations">대화 목록</Link>
      </div>
      <div className="chat-log" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`bubble bubble--${m.role}`}>
            {m.content}
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
