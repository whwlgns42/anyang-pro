"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../_lib/api-fetch";

type Notice = { id: string; title: string; body: string; source_url: string; posted_at: string | null };

// anyang-frontend-screens 4절: source_url은 새 탭으로만 연다. iframe 임베드는 하지 않는다.
export function NoticeDetail({ id }: { id: string }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/notices/${id}`).then(async (res) => {
      if (cancelled) return;
      if (res.status === 404) {
        setError("존재하지 않거나 숨김 처리된 공지입니다.");
        return;
      }
      if (!res.ok) {
        if (res.status !== 403) setError("공지를 불러오지 못했습니다.");
        return;
      }
      setNotice(await res.json());
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <main className="page">
        <p className="error-text">{error}</p>
      </main>
    );
  }

  if (!notice) {
    return (
      <main className="page">
        <p className="hint-text">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>{notice.title}</h1>
      <p style={{ whiteSpace: "pre-wrap" }}>{notice.body}</p>
      <p>
        <a href={notice.source_url} target="_blank" rel="noopener noreferrer">
          원문 보러 가기
        </a>
      </p>
    </main>
  );
}
