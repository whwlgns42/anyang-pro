"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../_lib/api-fetch";
import { confirmAction } from "../_lib/confirm";
import { noticesQueryString, type HiddenFilter } from "../_lib/notices-query";

type Notice = {
  id: string;
  title: string;
  source_url: string;
  published_at: string | null;
  collected_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
};

const PAGE_SIZE = 20;

// anyang-frontend-screens 11절 "공지 목록 탭"(확인 항목 23 반영, 설계 승인 2026-09-28).
// GET /api/admin/notices(상태 필터·페이지) 조회, PATCH .../hide|unhide는 확인 다이얼로그를
// 거친 뒤 낙관적 갱신 후 실패 시 롤백한다.
export function NoticesTab() {
  const [page, setPage] = useState(1);
  const [hiddenFilter, setHiddenFilter] = useState<HiddenFilter>("all");
  const [items, setItems] = useState<Notice[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const lastValidPage = useRef(1);

  async function load(requestedPage: number, filter: HiddenFilter) {
    setError(null);
    const res = await apiFetch(
      `/api/admin/notices?${noticesQueryString({ page: requestedPage, hiddenFilter: filter }, PAGE_SIZE)}`,
    );
    if (res.status === 400) {
      setError("요청이 올바르지 않습니다.");
      setPage(lastValidPage.current);
      return;
    }
    if (!res.ok) {
      if (res.status !== 403) setError("목록을 불러오지 못했습니다.");
      return;
    }
    const body = (await res.json()) as { items: Notice[]; total_count: number };
    lastValidPage.current = requestedPage;
    setItems(body.items);
    setTotalCount(body.total_count);
  }

  useEffect(() => {
    load(page, hiddenFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hiddenFilter]);

  function handleFilterChange(next: HiddenFilter) {
    setHiddenFilter(next);
    setPage(1);
  }

  async function handleToggleHide(notice: Notice) {
    const hiding = notice.hidden_at === null;
    const message = hiding
      ? `"${notice.title}" 공지를 숨기시겠습니까?`
      : `"${notice.title}" 공지 숨김을 해제하시겠습니까?`;
    if (!confirmAction(message)) return;

    const prevItems = items;
    setBusyId(notice.id);
    setItems(
      (prev) =>
        prev?.map((n) =>
          n.id === notice.id ? { ...n, hidden_at: hiding ? new Date().toISOString() : null } : n,
        ) ?? null,
    );
    const path = hiding
      ? `/api/admin/notices/${notice.id}/hide`
      : `/api/admin/notices/${notice.id}/unhide`;
    const res = await apiFetch(path, { method: "PATCH" });
    setBusyId(null);
    if (!res.ok) {
      setItems(prevItems ?? null);
      if (res.status !== 403) setError("처리에 실패했습니다.");
    }
  }

  const lastPage = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1;

  return (
    <div>
      <div className="tab-row" role="group" aria-label="상태 필터">
        <button
          type="button"
          className={hiddenFilter === "all" ? "" : "secondary"}
          onClick={() => handleFilterChange("all")}
          aria-pressed={hiddenFilter === "all"}
        >
          전체
        </button>
        <button
          type="button"
          className={hiddenFilter === "visible" ? "" : "secondary"}
          onClick={() => handleFilterChange("visible")}
          aria-pressed={hiddenFilter === "visible"}
        >
          정상만
        </button>
        <button
          type="button"
          className={hiddenFilter === "hidden" ? "" : "secondary"}
          onClick={() => handleFilterChange("hidden")}
          aria-pressed={hiddenFilter === "hidden"}
        >
          숨김만
        </button>
      </div>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="hint-text">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="hint-text">공지가 없어요.</p>
      ) : (
        <div className="overflow-x-auto"><table>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>제목</th>
              <th style={{ textAlign: "left" }}>게시일</th>
              <th style={{ textAlign: "left" }}>수집일</th>
              <th style={{ textAlign: "left" }}>상태</th>
              <th style={{ textAlign: "left" }}>동작</th>
            </tr>
          </thead>
          <tbody>
            {items.map((notice) => (
              <tr key={notice.id}>
                <td>
                  <a href={notice.source_url} target="_blank" rel="noreferrer">
                    {notice.title}
                  </a>
                </td>
                <td>
                  {notice.published_at ? new Date(notice.published_at).toLocaleDateString() : "-"}
                </td>
                <td>{new Date(notice.collected_at).toLocaleDateString()}</td>
                <td title={notice.hidden_reason ?? undefined}>
                  {notice.hidden_at ? "숨김" : "정상"}
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busyId === notice.id}
                    onClick={() => handleToggleHide(notice)}
                  >
                    {notice.hidden_at ? "해제" : "숨김"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <button type="button" className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          이전
        </button>
        <span className="hint-text">
          {page} / 전체 {totalCount}건
        </span>
        <button
          type="button"
          className="secondary"
          disabled={page >= lastPage}
          onClick={() => setPage((p) => p + 1)}
        >
          다음
        </button>
      </div>
    </div>
  );
}
