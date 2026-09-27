"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../_lib/api-fetch";

type Conversation = { id: string; title: string | null; updated_at: string };

// anyang-frontend-screens 8절: updated_at desc 목록, 새 대화 시작 버튼, 항목 클릭 시
// /chat?conversation_id=...로 이어서 연다(제안, 미확정 쿼리 방식을 그대로 채택).
export function ConversationsClient() {
  const [items, setItems] = useState<Conversation[] | null>(null);

  useEffect(() => {
    apiFetch("/api/conversations").then(async (res) => {
      if (res.ok) setItems(await res.json());
    });
  }, []);

  if (items === null) {
    return (
      <main className="page">
        <p className="hint-text">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>대화 히스토리</h1>
      <Link href="/chat" style={{ display: "block", marginBottom: 12 }}>
        <button type="button" style={{ width: "100%" }}>
          새 대화 시작
        </button>
      </Link>
      {items.length === 0 && <p className="hint-text">아직 대화 기록이 없어요.</p>}
      {items.map((c) => (
        <Link
          key={c.id}
          href={`/chat?conversation_id=${c.id}`}
          className="card"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          <strong>{c.title ?? "제목 없는 대화"}</strong>
          <p className="hint-text">{new Date(c.updated_at).toLocaleString()}</p>
        </Link>
      ))}
    </main>
  );
}
