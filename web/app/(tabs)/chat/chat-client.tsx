"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../_lib/api-fetch";
import { ageBandDisplay } from "../../_lib/age-band-label";
import { ChatSseParser, type Citation } from "../../_lib/chat-stream";
import { ENROLLMENT_STATUS_LABELS } from "../../_lib/profile-labels";
import { AnswerBlock, Composer, MessageBubble, type AnswerState } from "../../_components/ui/chat";
import { Icon, IconButton } from "../../_components/ui/icon";

type Message = { role: "user" | "assistant"; content: string; citations?: Citation[] };
type StoredMessage = { role: "user" | "assistant" | string; content: string };
type Profile = { birth_year: number | null; enrollment_status: string | null } | null;

// 조건 줄: 시안대로 나이대와 재학·재직 두 가지만 표시한다(확인 항목 52 승인). 값이 없으면 숨긴다.
function contextLine(profile: Profile): string | null {
  if (!profile) return null;
  const age = ageBandDisplay(profile.birth_year);
  const status =
    profile.enrollment_status && profile.enrollment_status in ENROLLMENT_STATUS_LABELS
      ? ENROLLMENT_STATUS_LABELS[profile.enrollment_status as keyof typeof ENROLLMENT_STATUS_LABELS]
      : null;
  const parts = [age, status ? `${status} 기준` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// anyang-frontend-screens "청안 디자인 적용 화면 스펙" 1번. 스트림 파싱·conversation_id 처리·
// 인용 카드 데이터(event: citations, anyang-backend-api 3-2절)는 기존 동작 그대로이고 외형만 바꿨다.
export function ChatClient({ initialConversationId }: { initialConversationId: string | null }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch("/api/profile")
      .then(async (res) => {
        if (res.ok) setProfile(await res.json());
      })
      .catch(() => {});
  }, []);

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

  // 새 메시지가 생겼을 때만 맨 아래로 내린다.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length, sending]);

  function startNewConversation() {
    if (sending) return;
    conversationIdRef.current = null;
    setMessages([]);
    setError(null);
    router.push("/chat");
  }

  async function handleSend() {
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

  const context = contextLine(profile);
  const lastIndex = messages.length - 1;
  const waitingForAnswer = sending && messages[lastIndex]?.role === "user";

  function answerState(m: Message, index: number): AnswerState {
    if (!sending || index !== lastIndex) return "done";
    return m.citations === undefined && m.content === "" ? "searching" : "streaming";
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center border-b border-rule pt-[calc(env(safe-area-inset-top)+6px)] pr-2 pb-1.5 pl-gutter">
        <h1 className="m-0 flex-1 font-display text-display-sm">청안</h1>
        <Link href="/conversations" aria-label="대화 기록" className="flex size-touch shrink-0 items-center justify-center text-ink">
          <Icon name="history" />
        </Link>
        <IconButton icon="plus" label="새 대화" onClick={startNewConversation} />
      </header>

      <div ref={scroller} role="log" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-gutter py-6">
        {messages.length === 0 && !sending && (
          <p className="m-auto text-center text-body-sm text-ink-2">궁금한 청년정책을 편하게 물어보세요.</p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <MessageBubble key={i}>{m.content}</MessageBubble>
          ) : (
            <AnswerBlock
              key={i}
              context={context}
              state={answerState(m, i)}
              sources={(m.citations ?? []).map((c) => ({ id: c.id, title: c.title, postedAt: c.posted_at }))}
            >
              {m.content}
            </AnswerBlock>
          ),
        )}
        {waitingForAnswer && <AnswerBlock context={context} state="searching" sources={[]} />}
        {error && (
          <p className="m-0 text-body-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <Composer value={input} onChange={setInput} onSubmit={handleSend} busy={sending} />
    </main>
  );
}
