"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../_lib/api-fetch";
import { ageBandDisplay } from "../../_lib/age-band-label";
import { ChatSseParser, type Citation } from "../../_lib/chat-stream";
import { browserStorage, mergeStreamingSnapshot, onLoadFailure, removeSnapshot, readSnapshot, scrollTarget, writeSnapshot } from "../../_lib/chat-snapshot";
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
export function ChatClient({ initialConversationId, userId }: { initialConversationId: string | null; userId: string | null }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const [restoring, setRestoring] = useState(initialConversationId !== null);
  const [interrupted, setInterrupted] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const loadedIdRef = useRef<string | null>(null);
  const readyRef = useRef(initialConversationId === null);
  const messagesRef = useRef<Message[]>([]);
  const streamingRef = useRef(false);
  const lastCitations = useRef<Citation[] | undefined>(undefined);
  const pendingScroll = useRef<{ scrollTop: number; atBottom: boolean } | null>(null);
  const firstRun = useRef(true);
  const loadAbort = useRef<AbortController | null>(null);
  const scrollState = useRef({ scrollTop: 0, atBottom: true });

  useEffect(() => {
    apiFetch("/api/profile")
      .then(async (res) => {
        if (res.ok) setProfile(await res.json());
      })
      .catch(() => {});
  }, []);

  // 3-1절 복원: 보관분(sessionStorage) -> 서버 순. loadedIdRef가 이미 쓰는 대화 id를 기록해,
  // 스트리밍 중 URL이 바뀌어 prop이 새 id가 되어도 messages를 덮어쓰지 않는다.
  useLayoutEffect(() => {
    // 뒤로가기 복원 시 prop이 이전 검색값으로 null일 수 있어, 첫 마운트에서는 실제 URL로 대체한다.
    const fromUrl = firstRun.current ? new URLSearchParams(window.location.search).get("conversation_id") : null;
    firstRun.current = false;
    const id = initialConversationId ?? fromUrl;
    if (!id) {
      // 브라우저 뒤로가기로 /chat에 도착: 진행 중인 이전 조회를 취소하고 새 대화 상태로 둔다.
      if (!readyRef.current) {
        loadAbort.current?.abort();
        loadedIdRef.current = null;
        conversationIdRef.current = null;
        readyRef.current = true;
        setRestoring(false);
      }
      return;
    }
    if (loadedIdRef.current === id) return;
    loadedIdRef.current = id;
    conversationIdRef.current = id;
    readyRef.current = false;
    pendingScroll.current = null; // 이전 대화의 복원 스크롤이 새 대화에 적용되지 않게 한다
    loadAbort.current?.abort(); // 늦게 온 이전 조회가 새 대화 messages를 덮어쓰지 않게 한다
    const ac = new AbortController();
    loadAbort.current = ac;
    setRestoring(true);
    const snap = userId ? readSnapshot(browserStorage(), userId, id) : null;
    const done = () => {
      if (ac.signal.aborted) return;
      readyRef.current = true;
      setRestoring(false);
    };
    if (snap && !snap.streaming) {
      pendingScroll.current = { scrollTop: snap.scrollTop, atBottom: snap.atBottom };
      setMessages(snap.messages);
      done();
      return;
    }
    // 서버 조회 실패(응답 오류·네트워크 예외 공통): 보관분을 보여 주되 404면 지우고 빈 화면으로 둔다.
    const fail = (status: number | null) => {
      if (ac.signal.aborted || !snap) return;
      if (onLoadFailure(status) === "delete") {
        if (userId) removeSnapshot(browserStorage(), userId, id);
        return;
      }
      streamingRef.current = snap.streaming; // 이동 직전 쓰기가 streaming:true를 지우지 않게 한다
      setMessages(snap.messages);
    };
    apiFetch(`/api/conversations/${id}/messages`, { signal: ac.signal })
      .then(async (res) => {
        if (ac.signal.aborted) return;
        if (!res.ok) return fail(res.status);
        const history = (await res.json()) as StoredMessage[];
        if (ac.signal.aborted) return;
        if (snap) {
          const merged = mergeStreamingSnapshot(snap.messages, history);
          pendingScroll.current = { scrollTop: snap.scrollTop, atBottom: snap.atBottom };
          setMessages(merged.messages);
          setInterrupted(merged.interrupted);
          streamingRef.current = merged.streaming;
          if (userId && !merged.interrupted) {
            writeSnapshot(browserStorage(), userId, id, { ...snap, messages: merged.messages, streaming: false });
          }
          return;
        }
        setMessages(
          history
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        );
      })
      .catch(() => fail(null))
      .finally(done);
  }, [initialConversationId, userId]);

  // 보관: 최신 상태를 ref에 들고, 즉시 쓰기(스트림 종료·인용 수신)와 500ms 지연 쓰기(델타)로 나눈다.
  function flush() {
    const id = conversationIdRef.current;
    if (!userId || !id || !readyRef.current) return;
    writeSnapshot(browserStorage(), userId, id, {
      messages: messagesRef.current,
      scrollTop: scrollState.current.scrollTop,
      atBottom: scrollState.current.atBottom,
      streaming: streamingRef.current,
    });
  }
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(() => {
    messagesRef.current = messages;
    const last = messages[messages.length - 1];
    if (!streamingRef.current || last?.role === "user" || last?.citations !== lastCitations.current) {
      lastCitations.current = last?.citations;
      flushRef.current();
      return;
    }
    const t = setTimeout(() => flushRef.current(), 500);
    return () => clearTimeout(t);
  }, [messages]);

  // 이동 직전·새로고침·탭 숨김에도 쓴다. 언마운트 정리 함수는 공지 상세로 가는 Link와 router.back()이 모두 지난다.
  useEffect(() => {
    const save = () => flushRef.current();
    const onHide = () => document.visibilityState === "hidden" && save();
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onHide);
      save();
    };
  }, []);

  // 복원 직후 첫 변화는 보관한 스크롤 위치로, 그 밖에는 새 메시지가 생겼을 때만 맨 아래로 내린다.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const { top, consumed } = scrollTarget(pendingScroll.current, messages.length, el.scrollHeight);
    if (consumed) pendingScroll.current = null;
    el.scrollTo({ top });
  }, [messages.length, sending]);

  function handleScroll() {
    const el = scroller.current;
    if (el) scrollState.current = { scrollTop: el.scrollTop, atBottom: el.scrollHeight - el.scrollTop - el.clientHeight <= 8 };
  }

  function startNewConversation() {
    if (sending) return;
    conversationIdRef.current = null;
    loadedIdRef.current = null;
    pendingScroll.current = null;
    loadAbort.current?.abort();
    readyRef.current = true;
    setRestoring(false);
    setMessages([]);
    setInterrupted(false);
    setError(null);
    router.push("/chat");
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInterrupted(false);
    streamingRef.current = true;
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
      streamingRef.current = false;
      setSending(false);
      if (res.status !== 403) {
        setError("응답을 받아오지 못했습니다.");
      }
      return;
    }

    const convId = res.headers.get("x-conversation-id");
    if (convId && convId !== conversationIdRef.current) {
      conversationIdRef.current = convId;
      loadedIdRef.current = convId; // prop이 새 id로 바뀌어도 불러오기로 덮어쓰지 않는다
      // router.replace는 page.tsx를 다시 그려 스트리밍 상태를 흔들 수 있어, 네이티브 replaceState로 URL만 맞춘다(3-1절 7번).
      window.history.replaceState(null, "", `/chat?conversation_id=${encodeURIComponent(convId)}`);
      flushRef.current();
    }

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
    streamingRef.current = false;
    flushRef.current(); // streaming:false를 즉시 기록
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

      <div ref={scroller} onScroll={handleScroll} role="log" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-gutter py-6">
        {messages.length === 0 && !sending && !restoring && (
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
        {interrupted && (
          <p className="m-0 text-meta text-ink-3">답변이 중간에 멈췄을 수 있어요. 새로고침하면 저장된 내용을 보여줘요.</p>
        )}
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
