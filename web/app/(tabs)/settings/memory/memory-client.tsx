"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../_lib/api-fetch";

type Preference = { id: string; preference_text: string; updated_at: string };

// anyang-frontend-screens 6절: 조회·수정·삭제. 수정은 PUT /api/preferences/:id(서버가 동기로
// 재임베딩) — 실패(502 EMBEDDING_FAILED)하면 편집 상태를 유지한 채 오류만 보여준다(목록은
// 애초에 낙관적으로 바꾸지 않았으므로 "이전 값으로 되돌리기"가 별도로 필요 없다).
export function MemoryClient() {
  const [items, setItems] = useState<Preference[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/preferences").then(async (res) => {
      if (res.ok) setItems(await res.json());
    });
  }, []);

  function startEdit(item: Preference) {
    setEditingId(item.id);
    setDraft(item.preference_text);
    setError(null);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    const res = await apiFetch(`/api/preferences/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preference_text: draft }),
    });
    setSaving(false);
    if (!res.ok) {
      if (res.status !== 403) {
        setError("수정 중 오류가 발생했습니다. 내용이 반영되지 않았습니다.");
      }
      return;
    }
    const updated = (await res.json()) as { id: string; preference_text: string };
    setItems(
      (prev) =>
        prev?.map((it) => (it.id === id ? { ...it, preference_text: updated.preference_text } : it)) ?? null,
    );
    setEditingId(null);
  }

  async function remove(id: string) {
    const res = await apiFetch(`/api/preferences/${id}`, { method: "DELETE" });
    if (res.status === 204) {
      setItems((prev) => prev?.filter((it) => it.id !== id) ?? null);
      return;
    }
    if (res.status !== 403) {
      setError("삭제 중 오류가 발생했습니다.");
    }
  }

  if (items === null) {
    return (
      <main className="page">
        <p className="hint-text">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>AI가 기억하는 내 정보</h1>
      <p className="hint-text">
        AI가 대화에서 알려주신 이름이나 호칭 같은 사실을 기억해 다음 대화에 활용해요. 기억한
        내용은 여기서 확인하고 언제든 지울 수 있어요.
      </p>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {items.length === 0 && <p className="hint-text">아직 대화에서 기억한 내용이 없어요.</p>}
      {items.map((item) => (
        <div className="card" key={item.id}>
          {editingId === item.id ? (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                style={{ width: "100%" }}
                aria-label="기억 내용 수정"
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => saveEdit(item.id)} disabled={saving}>
                  저장
                </button>
                <button type="button" className="secondary" onClick={() => setEditingId(null)}>
                  취소
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{item.preference_text}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="secondary" onClick={() => startEdit(item)}>
                  수정
                </button>
                <button type="button" className="danger" onClick={() => remove(item.id)}>
                  삭제
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </main>
  );
}
