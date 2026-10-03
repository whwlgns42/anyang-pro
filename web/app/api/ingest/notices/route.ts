import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireCollectorSecret } from "@/lib/scheduler-auth";
import { saveNotice } from "@/lib/notice-store";
import { countUnembedded, runEmbedJob } from "@/lib/embed-job";
import { EMBED_TIME_BUDGET_MS } from "@/lib/job-limits";
import { MAX_BODY_BYTES, parseRequest, validateItem } from "@/lib/ingest-notices";

// anyang-board-collector C — 보드 수집기가 보내는 공지를 받는다. 인증은 x-collector-secret 하나(C-1).
// anyang-backend-api 10절 — Fluid Compute 함수 최대 300초 한도를 명시.
export const maxDuration = 300;

type ItemResult = {
  source_url: string;
  result: "created" | "updated" | "unchanged" | "rejected" | "error";
  code?: string;
};

// 로그에는 오류 메시지 앞부분만 남긴다(본문·키 금지).
const msg = (err: unknown) => (err instanceof Error ? err.message.slice(0, 200) : "unknown");

export async function POST(request: Request) {
  const authError = requireCollectorSecret(request);
  if (authError) return authError;

  const startedAt = Date.now();
  try {
    // 본문을 읽기 전에 선언된 길이로 먼저 거른다(헤더가 없으면 읽은 뒤 검사).
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }
    const text = await request.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const req = parseRequest(json);
    if (!req) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

    // 항목별 트랜잭션 — 한 항목의 실패가 다른 항목을 막지 않는다.
    const results: ItemResult[] = [];
    let collected = 0;
    for (const raw of req.items) {
      const v = validateItem(raw);
      if (!v.ok) {
        const url = (raw as { source_url?: unknown } | null)?.source_url;
        results.push({ source_url: typeof url === "string" ? url : "", result: "rejected", code: v.code });
        continue;
      }
      try {
        const client = await pool.connect();
        try {
          const r = await saveNotice(client, v.item);
          if (r !== "unchanged") collected++;
          results.push({ source_url: v.item.source_url, result: r });
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("ingest/notices: save failed", msg(err));
        results.push({ source_url: v.item.source_url, result: "error", code: "DB_ERROR" });
      }
    }

    // 보고 호출(report)은 임베딩을 부르지 않는다. 임베딩 실패는 응답을 실패로 바꾸지 않는다.
    if (!req.report) {
      try {
        while (Date.now() - startedAt < EMBED_TIME_BUDGET_MS) {
          const r = await runEmbedJob();
          if (r.embedded_chunks === 0) break;
        }
      } catch (err) {
        console.error("ingest/notices: embed job failed", msg(err));
      }
    }
    let remaining: number | null = null;
    try {
      remaining = await countUnembedded();
    } catch (err) {
      console.error("ingest/notices: countUnembedded failed", msg(err));
    }

    // 호출 1회당 collect_runs 1행(끝에 한 번 insert, C-4 4번).
    const rejected = results.filter((r) => r.result === "rejected").length;
    const errored = results.filter((r) => r.result === "error").length;
    const summary = req.report
      ? `${req.report.error_code} kind=${req.kind}`
      : rejected + errored > 0
        ? `rejected=${rejected}, error=${errored}`
        : null;
    try {
      await pool.query(
        `insert into collect_runs (trigger_type, status, started_at, finished_at, collected_count, error_summary, triggered_by)
         values ('scheduled', $1, $2, now(), $3, $4, null)`,
        [req.report ? "failed" : "success", new Date(startedAt).toISOString(), collected, summary],
      );
    } catch (err) {
      console.error("ingest/notices: collect_runs insert failed", msg(err));
    }

    console.log(
      `ingest/notices: kind=${req.kind} items=${results.length} collected=${collected} rejected=${rejected} error=${errored}`,
    );
    return NextResponse.json({ results, collected_count: collected, remaining_unembedded: remaining });
  } catch (err) {
    console.error("ingest/notices: failed", msg(err));
    return NextResponse.json({ error: "INGEST_FAILED" }, { status: 500 });
  }
}
