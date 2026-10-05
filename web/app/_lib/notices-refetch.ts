// 공지 목록 최신성: 탭 복귀·뒤로가기 복원 시 1페이지를 조용히 다시 받는다.

export const REFETCH_MIN_GAP_MS = 30_000;

// 마지막 성공 조회 후 minGapMs 안이거나 조회 중이면 생략한다.
export function shouldRefetch(lastFetchedAt: number | null, now: number, minGapMs: number, inFlight = false): boolean {
  if (inFlight) return false;
  return lastFetchedAt === null || now - lastFetchedAt >= minGapMs;
}

// 새 1페이지를 앞에 두고, 이미 쌓인 항목 중 같은 id는 뺀 채 이어 붙인다.
export function mergeFirstPage<T extends { id: string }>(prev: T[], firstPage: T[]): T[] {
  const ids = new Set(firstPage.map((x) => x.id));
  return [...firstPage, ...prev.filter((x) => !ids.has(x.id))];
}

// "더 보기" 페이지를 이어 붙이되, 이미 있는 id는 건너뛴다(재조회로 offset이 밀려 겹칠 수 있음).
export function appendPage<T extends { id: string }>(prev: T[], next: T[]): T[] {
  const ids = new Set(prev.map((x) => x.id));
  return [...prev, ...next.filter((x) => !ids.has(x.id))];
}

type Doc = Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
type Win = Pick<Window, "addEventListener" | "removeEventListener">;

// visible이 될 때와 persisted pageshow일 때만 onTrigger를 부른다. 반환 함수로 해제한다.
export function subscribeRefetch(doc: Doc, win: Win, onTrigger: () => void): () => void {
  const onVisibility = () => {
    if (doc.visibilityState === "visible") onTrigger();
  };
  const onPageShow = (e: Event) => {
    if ((e as PageTransitionEvent).persisted) onTrigger();
  };
  doc.addEventListener("visibilitychange", onVisibility);
  win.addEventListener("pageshow", onPageShow);
  return () => {
    doc.removeEventListener("visibilitychange", onVisibility);
    win.removeEventListener("pageshow", onPageShow);
  };
}

// "더 보기" 판정(15-6절): 한 페이지를 꽉 채워 받았을 때만 다음 페이지가 있을 수 있다.
export const NOTICES_PAGE_SIZE = 20;
export function hasMorePages(received: number, pageSize: number): boolean {
  return received === pageSize;
}
