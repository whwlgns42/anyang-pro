"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../_lib/api-fetch";

type ProviderRow = {
  provider: string;
  day: string;
  success_count: number;
  rate_limited_count: number;
  error_count: number;
  input_tokens: number | null;
  output_tokens: number | null;
  limit_note: string | null;
};

// anyang-frontend-screens 14절: 제공자(DeepSeek/Gemini)별 날짜별 표. limit_note가 null이면
// "-"로 표시(DeepSeek 행).
export function ApiUsageClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [providers, setProviders] = useState<ProviderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    const res = await apiFetch(`/api/admin/api-usage/summary${query ? `?${query}` : ""}`);
    if (res.ok) {
      const data = (await res.json()) as { providers: ProviderRow[] };
      setProviders(data.providers);
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
      <h1>외부 API 사용량</h1>
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

      {providers && (
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>제공자</th>
              <th style={{ textAlign: "left" }}>날짜</th>
              <th style={{ textAlign: "left" }}>성공</th>
              <th style={{ textAlign: "left" }}>한도 초과</th>
              <th style={{ textAlign: "left" }}>오류</th>
              <th style={{ textAlign: "left" }}>입력 토큰</th>
              <th style={{ textAlign: "left" }}>출력 토큰</th>
              <th style={{ textAlign: "left" }}>한도 대비</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((row, i) => (
              <tr key={`${row.provider}-${row.day}-${i}`}>
                <td>{row.provider}</td>
                <td>{new Date(row.day).toLocaleDateString()}</td>
                <td>{row.success_count}</td>
                <td>{row.rate_limited_count}</td>
                <td>{row.error_count}</td>
                <td>{row.input_tokens ?? "-"}</td>
                <td>{row.output_tokens ?? "-"}</td>
                <td>{row.limit_note ?? "-"}</td>
              </tr>
            ))}
            {providers.length === 0 && (
              <tr>
                <td colSpan={8}>해당 기간에 사용 기록이 없어요.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}
