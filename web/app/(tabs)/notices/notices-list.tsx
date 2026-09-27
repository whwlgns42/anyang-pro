"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../_lib/api-fetch";

type NoticeItem = { id: string; title: string; excerpt: string; posted_at: string | null };

// anyang-frontend-screens 4절. 무한 스크롤 대신 "더 보기" 버튼으로 페이지네이션한다(제안,
// YAGNI — IntersectionObserver 없이 같은 결과를 더 단순하게 얻는다). 선호가 없는 신규
// 사용자 여부는 별도 필드가 없어 판단할 수 없으므로(설계 문서도 이 판단 방식을 미확정으로
// 남김) 빈 상태 안내는 "아직 추천할 공지가 없다"는 일반 문구로 대체했다.
export function NoticesList() {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/notices/recommended?page=${page}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status !== 403) setError("공지를 불러오지 못했습니다.");
          return;
        }
        const data = (await res.json()) as NoticeItem[];
        if (cancelled) return;
        setItems((prev) => (page === 1 ? data : [...prev, ...data]));
        setHasMore(data.length > 0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <main className="page">
      <h1>추천 공지</h1>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {!loading && items.length === 0 && !error && (
        <p className="hint-text">아직 추천할 공지가 없어요.</p>
      )}
      {items.map((item) => (
        <Link key={item.id} href={`/notices/${item.id}`} className="card">
          <strong>{item.title}</strong>
          <p>{item.excerpt}</p>
        </Link>
      ))}
      {loading && <p className="hint-text">불러오는 중...</p>}
      {!loading && hasMore && items.length > 0 && (
        <button type="button" className="secondary" onClick={() => setPage((p) => p + 1)}>
          더 보기
        </button>
      )}
    </main>
  );
}
