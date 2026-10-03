import { INGEST_TIMEOUT_MS } from "./constants";
import { userAgent } from "../lib/notice-parser";

// anyang-board-collector A-4 5·7번 — 받기 API 호출. 키는 헤더로만 보내고 로그에 남기지 않는다.
export type IngestResponse = { status: number; json: any };

export function makeIngestClient(baseUrl: string, secret: string, fetchFn: typeof fetch) {
  const base = baseUrl.replace(/\/+$/, "");
  async function post(path: string, body: unknown): Promise<IngestResponse> {
    const res = await fetchFn(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-collector-secret": secret, "user-agent": userAgent() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(INGEST_TIMEOUT_MS),
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      // 본문이 JSON이 아니면(빈 401 등) null
    }
    return { status: res.status, json };
  }
  return {
    notices: (body: unknown) => post("/api/ingest/notices", body),
    embed: () => post("/api/jobs/embed", {}),
  };
}
