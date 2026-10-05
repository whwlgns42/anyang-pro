"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../_lib/api-fetch";
import { formatKoreanDay } from "../../_lib/format";
import { Button } from "../../_components/ui/controls";
import { Sheet } from "../../_components/ui/sheet";
import { InterestSheetBody } from "./interest-sheet";
import type { InterestStatus } from "../../_lib/interest-sheet";
import { NoticeRow } from "../../_components/ui/notice-row";
import { REFETCH_MIN_GAP_MS, appendPage, mergeFirstPage, shouldRefetch, subscribeRefetch } from "../../_lib/notices-refetch";

type NoticeItem = {
  id: string;
  title: string;
  excerpt: string;
  posted_at: string | null;
  is_pinned?: boolean;
  image_count?: number;
};

// anyang-frontend-screens "청안 디자인 적용 화면 스펙" 2번(공지 목록). 무한 스크롤 대신 "더 보기"
// 버튼으로 페이지네이션한다. 관심사 개수는 GET /api/preferences 길이이며, 이 호출이 실패하면
// 머리 제목은 "최근 공지", 설명 줄은 생략한다.
export function NoticesList() {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefStatus, setPrefStatus] = useState<InterestStatus>("loading");
  const [prefs, setPrefs] = useState<{ id: string; preference_text: string }[]>([]);
  const [prefTry, setPrefTry] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastFetchedAt = useRef<number | null>(null);
  const refetching = useRef(false);

  // 서버·클라이언트 불일치(hydration)를 피하려고 마운트 뒤에 계산한다.
  useEffect(() => {
    setToday(formatKoreanDay());
  }, []);

  // 마운트 때 한 번(다시 시도하면 prefTry가 늘어 다시) 받는다. 머리 개수와 관심사 시트가 같은 결과를 쓴다.
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/preferences")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { id: string; preference_text: string }[];
        if (cancelled) return;
        setPrefs(data);
        setPrefStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setPrefStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [prefTry]);

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
        setItems((prev) => (page === 1 ? data : appendPage(prev, data)));
        setHasMore(data.length > 0);
        if (page === 1) lastFetchedAt.current = Date.now();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  // 탭 복귀·뒤로가기 복원 시 1페이지를 조용히 다시 받는다(로딩·오류 문구 없음, 실패하면 기존 목록 유지).
  useEffect(() => {
    return subscribeRefetch(document, window, () => {
      if (!shouldRefetch(lastFetchedAt.current, Date.now(), REFETCH_MIN_GAP_MS, refetching.current)) return;
      refetching.current = true;
      apiFetch("/api/notices/recommended?page=1")
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as NoticeItem[];
          lastFetchedAt.current = Date.now();
          setItems((prev) => mergeFirstPage(prev, data));
        })
        .catch(() => {})
        .finally(() => {
          refetching.current = false;
        });
    });
  }, []);

  const interestCount = prefStatus === "ok" ? prefs.length : null;
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
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="dialog"
              onClick={() => setSheetOpen(true)}
              className="ml-auto flex min-h-touch shrink-0 items-center rounded-none border-0 bg-transparent p-0 text-body-sm font-medium text-ink no-underline"
            >
              관심사 보기
            </button>
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
            <NoticeRow
              key={item.id}
              id={item.id}
              title={item.title}
              excerpt={item.excerpt}
              postedAt={item.posted_at}
              isPinned={item.is_pinned}
              imageCount={item.image_count}
            />
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
      <Sheet open={sheetOpen} triggerRef={triggerRef} title="대화에서 모인 관심사" onClose={() => setSheetOpen(false)}>
        <InterestSheetBody
          status={prefStatus}
          items={prefs}
          onRetry={() => {
            setPrefStatus("loading");
            setPrefTry((n) => n + 1);
          }}
        />
      </Sheet>
    </main>
  );
}
