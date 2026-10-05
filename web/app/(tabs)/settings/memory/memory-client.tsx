"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../_lib/api-fetch";
import { createDelayedDelete } from "../../../_lib/delayed-delete";
import { Toast } from "../../../_components/ui/controls";
import { LoadError } from "../../../_components/ui/load-error";
import { IconButton } from "../../../_components/ui/icon";

type Preference = { id: string; preference_text: string; updated_at: string };
type Removed = { item: Preference; index: number };

const EDIT_FAILED = "수정 중 오류가 발생했습니다. 내용이 반영되지 않았습니다.";
const short = (text: string) => (text.length > 12 ? `${text.slice(0, 12)}…` : text);

// anyang-frontend-screens "청안 디자인 적용 화면 스펙" 5번의 기억 구역(/settings 안). 수정은
// PUT /api/preferences/:id(서버가 동기로 재임베딩)이고 502면 편집 상태를 유지한 채 오류만 보인다.
// 삭제는 5초 지연: 목록에서 먼저 지우고, 서버 DELETE는 5초 뒤(되돌리면 보내지 않음). 화면을 떠나거나
// 탭을 숨기면 즉시(keepalive) 보내고, 다른 항목을 지우면 앞 항목을 즉시 보낸다.
export function MemoryClient() {
  const [items, setItems] = useState<Preference[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [removed, setRemoved] = useState<Removed | null>(null);

  const restore = useCallback(({ item, index }: Removed) => {
    setItems((prev) => {
      const list = prev ?? [];
      if (list.some((it) => it.id === item.id)) return list;
      const next = [...list];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
  }, []);

  const [deleter] = useState(() =>
    createDelayedDelete<Removed>({
      send: async ({ item }, keepalive) => {
        const res = await apiFetch(`/api/preferences/${item.id}`, { method: "DELETE", keepalive });
        if (res.status !== 204) throw new Error(String(res.status));
      },
      onFail: (r) => {
        restore(r);
        setError("삭제 중 오류가 발생했습니다.");
      },
    }),
  );

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    apiFetch("/api/preferences")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          if (res.status !== 403) setLoadFailed(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tries]);

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

  function startEdit(item: Preference) {
    setEditingId(item.id);
    setDraft(item.preference_text);
    setError(null);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/preferences/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preference_text: draft }),
      });
      if (!res.ok) {
        if (res.status !== 403) setError(EDIT_FAILED);
        return;
      }
      const updated = (await res.json()) as { id: string; preference_text: string };
      setItems(
        (prev) =>
          prev?.map((it) => (it.id === id ? { ...it, preference_text: updated.preference_text } : it)) ?? null,
      );
      setEditingId(null);
    } catch {
      setError(EDIT_FAILED);
    } finally {
      setSaving(false);
    }
  }

  function remove(item: Preference) {
    if (!items) return;
    const entry = { item, index: items.findIndex((it) => it.id === item.id) };
    setError(null);
    setItems(items.filter((it) => it.id !== item.id));
    deleter.schedule(entry);
    setRemoved(entry);
  }

  const dismissToast = useCallback(() => setRemoved(null), []);
  const undo = useCallback(() => {
    const entry = deleter.undo();
    if (entry) restore(entry);
    setRemoved(null);
  }, [deleter, restore]);

  return (
    <section id="memory" className="flex scroll-mt-4 flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-title">AI가 기억하는 내 정보</h2>
        <p className="m-0 text-label font-normal text-ink-2">
          AI가 대화에서 알려주신 이름이나 호칭 같은 사실을 기억해 다음 대화에 활용해요. 기억한 내용은 여기서 확인하고 언제든 지울 수 있어요. 추천과 알림은 이 문장들을 기준으로 골라요.
        </p>
      </div>

      {error && (
        <p className="m-0 text-body-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      {items === null ? (
        loadFailed ? (
          <LoadError message="기억한 내용을 불러오지 못했어요." onRetry={() => setTries((n) => n + 1)} />
        ) : (
          <p className="m-0 text-body-sm text-ink-2">불러오는 중...</p>
        )
      ) : items.length === 0 ? (
        <p className="m-0 rounded-control border border-rule bg-surface px-4 py-3.5 text-body-sm text-ink-2">
          아직 대화에서 기억한 내용이 없어요.
        </p>
      ) : (
        <ul className="m-0 list-none divide-y divide-rule rounded-control border border-rule bg-surface p-0">
          {items.map((item) => (
            <li key={item.id} className="flex items-center py-2.5 pr-1 pl-4">
              {editingId === item.id ? (
                <div className="flex flex-1 flex-col gap-2 py-1 pr-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    aria-label="기억 내용 수정"
                    className="w-full resize-none rounded-control border border-field bg-paper px-3 py-2 text-body text-ink"
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-touch rounded-none border-0 bg-transparent px-3 text-body-sm font-normal text-ink-2"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(item.id)}
                      disabled={saving || !draft.trim()}
                      className="h-touch rounded-none border-0 bg-transparent px-3 text-body-sm font-semibold text-accent disabled:text-ink-3 disabled:opacity-100"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="m-0 flex-1 py-1 text-body">{item.preference_text}</p>
                  <IconButton icon="pencil" iconSize={18} label={`수정: ${short(item.preference_text)}`} className="text-ink-3" onClick={() => startEdit(item)} />
                  <IconButton icon="trash" iconSize={18} label={`삭제: ${short(item.preference_text)}`} className="text-ink-3" onClick={() => remove(item)} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {removed && <Toast message="관심사를 지웠어요" actionLabel="되돌리기" onAction={undo} onDismiss={dismissToast} />}
    </section>
  );
}
