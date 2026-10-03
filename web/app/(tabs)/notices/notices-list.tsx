"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../_lib/api-fetch";
import { formatKoreanDay } from "../../_lib/format";
import { Button } from "../../_components/ui/controls";
import { NoticeRow } from "../../_components/ui/notice-row";

type NoticeItem = { id: string; title: string; excerpt: string; posted_at: string | null };

// anyang-frontend-screens "청안 디자인 적용 화면 스펙" 2번(공지 목록). 무한 스크롤 대신 "더 보기"
// 버튼으로 페이지네이션한다. 관심사 개수는 GET /api/preferences 길이이며, 이 호출이 실패하면
// 머리 제목은 "최근 공지", 설명 줄은 생략한다.
export function NoticesList() {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interestCount, setInterestCount] = useState<number | null>(null);
  const [today, setToday] = useState<string | null>(null);

  // 서버·클라이언트 불일치(hydration)를 피하려고 마운트 뒤에 계산한다.
  useEffect(() => {
    setToday(formatKoreanDay());
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/preferences")
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as unknown[];
        setInterestCount(data.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  const personalized = (interestCount ?? 0) > 0;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <header className="flex flex-col px-gutter pt-[calc(env(safe-area-inset-top)+20px)]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-title">청안</span>
            <span className="min-h-4 font-mono text-meta text-ink-3">{today}</span>
          </div>
          <h1 className="m-0 mt-3.5 font-display text-display">{personalized ? "나에게 맞는 공지" : "최근 공지"}</h1>
          <div className="flex items-center justify-between gap-3">
            {interestCount !== null && (
              <p className="m-0 text-body-sm text-ink-2">
                {personalized
                  ? `대화에서 모인 관심사 ${interestCount}개와 가까운 순서예요`
                  : "아직 대화 전이라 최신순이에요. 대화할수록 더 잘 맞춰져요."}
              </p>
            )}
            <Link href="/settings" className="ml-auto flex min-h-touch shrink-0 items-center text-body-sm font-medium text-ink no-underline">
              관심사 보기
            </Link>
          </div>
          <div className="h-0.5 bg-ink" />
        </header>

        {error && (
          <p className="m-0 px-gutter pt-4 text-body-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        {!loading && items.length === 0 && !error && (
          <p className="m-0 px-gutter pt-4 text-body-sm text-ink-2">아직 추천할 공지가 없어요.</p>
        )}
        <ol className="m-0 list-none p-0 px-gutter">
          {items.map((item) => (
            <NoticeRow key={item.id} id={item.id} title={item.title} excerpt={item.excerpt} postedAt={item.posted_at} />
          ))}
        </ol>
        {loading && <p className="m-0 px-gutter py-4 text-body-sm text-ink-2">불러오는 중...</p>}
        {!loading && hasMore && items.length > 0 && (
          <div className="px-gutter py-6">
            <Button variant="secondary" className="w-full" onClick={() => setPage((p) => p + 1)}>
              더 보기
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
