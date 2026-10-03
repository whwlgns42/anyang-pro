"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../_lib/api-fetch";
import {
  DIRECT_COLLECT_DISABLED_NOTICE,
  HISTORY_HINT,
  describeRun,
  isDirectCollectDisabled,
} from "../../_lib/collect-run-label";
import { NoticesTab } from "./notices-tab";

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

// anyang-frontend-screens 11절: 실행 이력 + 수동 수집 실행(최대 300초, 진행 상태 표시) +
// "공지 목록" 탭(확인 항목 23 반영, 설계 승인 2026-09-28 — 숨김/해제는 notices-tab.tsx).
export function CollectRunsClient() {
  const [runs, setRuns] = useState<CollectRun[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabledNotice, setDisabledNotice] = useState(false);
  const [tab, setTab] = useState<"runs" | "notices">("runs");

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
      const body = res.status === 410 ? await res.json().catch(() => null) : null;
      if (isDirectCollectDisabled(res.status, body)) {
        setDisabledNotice(true);
        return;
      }
      if (res.status !== 403) setError("수집 실행 중 오류가 발생했습니다.");
      return;
    }
    await load();
  }

  return (
    <main className="page">
      <h1>공지 수집 관리</h1>

      <div role="tablist" aria-label="공지 수집 관리 탭" className="tab-row">
        <button
          type="button"
          className={tab === "runs" ? "" : "secondary"}
          onClick={() => setTab("runs")}
          aria-pressed={tab === "runs"}
        >
          실행 이력
        </button>
        <button
          type="button"
          className={tab === "notices" ? "" : "secondary"}
          onClick={() => setTab("notices")}
          aria-pressed={tab === "notices"}
        >
          공지 목록
        </button>
      </div>

      {tab === "runs" ? (
        runs === null ? (
          <p className="hint-text">불러오는 중...</p>
        ) : (
          <>
            <button type="button" onClick={handleRunNow} disabled={running || disabledNotice} style={{ marginBottom: 12 }}>
              {running ? "수집 실행 중... (최대 5분)" : "지금 수집 실행"}
            </button>
            {disabledNotice && (
              <p className="hint-text" role="status">
                {DIRECT_COLLECT_DISABLED_NOTICE}
              </p>
            )}
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <p className="hint-text">{HISTORY_HINT}</p>
            {runs.length === 0 && <p className="hint-text">아직 수집 실행 기록이 없어요.</p>}
            {runs.map((run) => {
              const l = describeRun(run);
              return (
                <div className="card" key={run.id}>
                  <strong>{new Date(run.started_at).toLocaleString()}</strong>
                  <p className="hint-text">
                    실행 방식: {l.trigger} · 상태: {l.status} · 수집 건수: {l.count}
                  </p>
                  {l.message && (
                    <p className={l.message.tone === "error" ? "error-text" : "hint-text"}>
                      {l.message.text}
                      {l.message.raw && (
                        <>
                          {" "}
                          <small>{l.message.raw}</small>
                        </>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        )
      ) : (
        <NoticesTab />
      )}
    </main>
  );
}
