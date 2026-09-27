import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { runCollectJob } from "@/lib/collector";

// anyang-backend-api 13-1절 — collect_runs 목록 조회, 수동 수집 실행(동기, manual).
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

  const result = await runCollectJob("manual", admin.userId);
  if (!result.ok) {
    const status = result.reason === "ROBOTS_DISALLOWED" ? 409 : 500;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ collected_count: result.collectedCount });
}
