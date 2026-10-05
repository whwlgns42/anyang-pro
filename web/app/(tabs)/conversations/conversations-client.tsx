"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../_lib/api-fetch";
import { createDelayedDelete } from "../../_lib/delayed-delete";
import { deleteConversation } from "../../_lib/delete-conversation";
import { focusIndexAfterRemove, insertBack } from "../../_lib/restore-item";
import { buttonClass, Toast } from "../../_components/ui/controls";
import { ScreenHeader } from "../../_components/ui/screen";
import { ConversationRow } from "./conversation-row";

type Conversation = { id: string; title: string | null; updated_at: string };
type Removed = { item: Conversation; index: number };

// anyang-frontend-screens 8절 + 8-2절: updated_at desc 목록, 새 대화 시작, 항목 클릭 시
// /chat?conversation_id=...로 이어서 연다. 삭제는 기억 화면(memory-client)과 같은 5초 지연 삭제:
// 목록에서 먼저 지우고 서버 DELETE는 5초 뒤(되돌리면 보내지 않음), 이탈·탭 숨김 때는 즉시(keepalive).
export function ConversationsClient({ userId }: { userId: string | null }) {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const newLink = useRef<HTMLAnchorElement>(null);
  // 삭제·되돌리기 직후 포커스를 줄 대상: 대화 id, 또는 목록이 비었을 때 "new"
  const focusTarget = useRef<string | null>(null);

  const restore = useCallback((r: Removed) => setItems((prev) => insertBack(prev ?? [], r)), []);

  const [deleter] = useState(() =>
    createDelayedDelete<Removed>({
      send: ({ item }, keepalive) => deleteConversation(item.id, userId, { keepalive }),
      onFail: (r) => {
        restore(r);
        setError("삭제 중 오류가 발생했습니다.");
      },
    }),
  );

  useEffect(() => {
    apiFetch("/api/conversations").then(async (res) => {
      if (res.ok) setItems(await res.json());
    });
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") deleter.flush(true);
    };
    const onPageHide = () => deleter.flush(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      deleter.flush(true); // 다른 화면으로 이동
    };
  }, [deleter]);

  // 버튼이 사라지면 포커스가 body로 떨어지므로 다음 행(없으면 앞 행, 비면 "새 대화 시작")으로 옮긴다.
  useEffect(() => {
    const t = focusTarget.current;
    if (!t) return;
    focusTarget.current = null;
    (t === "new" ? newLink.current : links.current.get(t))?.focus();
  }, [items]);

  function remove(item: Conversation) {
    if (!items) return;
    const index = items.findIndex((c) => c.id === item.id);
    const next = items.filter((c) => c.id !== item.id);
    const at = focusIndexAfterRemove(next.length, index);
    focusTarget.current = at < 0 ? "new" : next[at].id;
    setError(null);
    setItems(next);
    deleter.schedule({ item, index });
    setRemoved({ item, index });
  }

  const dismissToast = useCallback(() => setRemoved(null), []);
  const undo = useCallback(() => {
    const entry = deleter.undo();
    if (entry) {
      focusTarget.current = entry.item.id;
      restore(entry);
    }
    setRemoved(null);
  }, [deleter, restore]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <ScreenHeader title="대화 기록" />
        <div className="px-gutter pb-6">
          <Link ref={newLink} href="/chat" className={`${buttonClass("secondary")} w-full`}>
            새 대화 시작
          </Link>
          {error && (
            <p className="m-0 pt-4 text-body-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          {items === null ? (
            <p className="m-0 pt-4 text-body-sm text-ink-2">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="m-0 pt-4 text-body-sm text-ink-2">아직 대화 기록이 없어요.</p>
          ) : (
            <ol className="m-0 mt-4 list-none border-t-2 border-ink p-0">
              {items.map((c) => (
                <ConversationRow
                  key={c.id}
                  ref={(el) => {
                    if (el) links.current.set(c.id, el);
                    else links.current.delete(c.id);
                  }}
                  id={c.id}
                  title={c.title}
                  date={c.updated_at}
                  onDelete={() => remove(c)}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
      {removed && (
        <Toast key={removed.item.id} message="대화를 지웠어요" actionLabel="되돌리기" onAction={undo} onDismiss={dismissToast} />
      )}
    </main>
  );
}
