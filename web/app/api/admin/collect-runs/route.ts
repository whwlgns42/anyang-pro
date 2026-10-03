import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { runCollectJob } from "@/lib/collector";

// anyang-backend-api 13-1절 — collect_runs 목록 조회, 수동 수집 실행(동기, manual).
// anyang-backend-api 10절 — POST가 실행하는 runCollectJob과 동일한 Fluid Compute 300초 한도 전제.
export const maxDuration = 300;

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { rows } = await pool.query(
    `select id, started_at, finished_at, trigger_type, status, collected_count, error_summary, triggered_by
       from collect_runs
      order by started_at desc
      limit 50`,
  );
  return NextResponse.json(rows);
}

export async function POST() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const result = await runCollectJob("manual", admin.userId, { mode: "full" });
  if (!result.ok) {
    // 겹치면 409 ALREADY_RUNNING(5-1절 6번).
    const status = result.reason === "ROBOTS_DISALLOWED" || result.reason === "ALREADY_RUNNING" ? 409 : 500;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ collected_count: result.collectedCount });
}
