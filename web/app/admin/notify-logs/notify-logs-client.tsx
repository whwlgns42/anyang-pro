"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../_lib/api-fetch";

type DailyRow = { day: string; success_count: number; failed_count: number };
type Summary = { daily: DailyRow[]; notify_enabled_count: number; push_device_count: number };

// anyang-frontend-screens 12절: 날짜별 표(차트 라이브러리는 YAGNI로 도입하지 않음),
// 상단 집계(notify_enabled_count, push_device_count), from/to 날짜 범위.
export function NotifyLogsClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    const res = await apiFetch(`/api/admin/notify-logs/summary${query ? `?${query}` : ""}`);
    if (res.ok) {
      setSummary(await res.json());
    } else if (res.status !== 403) {
      setError("불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page">
      <h1>알림 발송 현황</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
        <div className="field">
          <label htmlFor="from-date">시작일</label>
          <input id="from-date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="to-date">종료일</label>
          <input id="to-date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="button" onClick={load} style={{ marginBottom: 12 }}>
          조회
        </button>
      </div>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <>
          <p>
            알림 켠 사용자: {summary.notify_enabled_count}명 · 등록된 기기: {summary.push_device_count}대
          </p>
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>날짜</th>
                <th style={{ textAlign: "left" }}>성공</th>
                <th style={{ textAlign: "left" }}>실패</th>
              </tr>
            </thead>
            <tbody>
              {summary.daily.map((row) => (
                <tr key={row.day}>
                  <td>{new Date(row.day).toLocaleDateString()}</td>
                  <td>{row.success_count}</td>
                  <td>{row.failed_count}</td>
                </tr>
              ))}
              {summary.daily.length === 0 && (
                <tr>
                  <td colSpan={3}>해당 기간에 발송 기록이 없어요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
