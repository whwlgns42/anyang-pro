"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../_lib/api-fetch";

type CollectRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  trigger_type: string;
  status: string;
  collected_count: number | null;
  error_summary: string | null;
  triggered_by: string | null;
};

// anyang-frontend-screens 11절: 실행 이력 + 수동 수집 실행(최대 300초, 진행 상태 표시).
// 공지 숨김/해제(PATCH /api/admin/notices/:id/hide|unhide)는 대상을 고를 목록 API
// (예: GET /api/admin/notices)가 아직 없어 이번 라운드에서는 만들지 않는다 — 보고에
// "backend 조율 필요"로 남긴다.
export function CollectRunsClient() {
  const [runs, setRuns] = useState<CollectRun[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/api/admin/collect-runs");
    if (res.ok) setRuns(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRunNow() {
    setRunning(true);
    setError(null);
    const res = await apiFetch("/api/admin/collect-runs", { method: "POST" });
    setRunning(false);
    if (!res.ok) {
      if (res.status !== 403) setError("수집 실행 중 오류가 발생했습니다.");
      return;
    }
    await load();
  }

  if (runs === null) {
    return (
      <main className="page">
        <p className="hint-text">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>공지 수집 관리</h1>
      <button type="button" onClick={handleRunNow} disabled={running} style={{ marginBottom: 12 }}>
        {running ? "수집 실행 중... (최대 5분)" : "지금 수집 실행"}
      </button>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {runs.length === 0 && <p className="hint-text">아직 수집 실행 기록이 없어요.</p>}
      {runs.map((run) => (
        <div className="card" key={run.id}>
          <strong>{new Date(run.started_at).toLocaleString()}</strong>
          <p className="hint-text">
            트리거: {run.trigger_type} · 상태: {run.status} · 수집 건수:{" "}
            {run.collected_count ?? "-"}
          </p>
          {run.error_summary && <p className="error-text">{run.error_summary}</p>}
        </div>
      ))}
    </main>
  );
}
