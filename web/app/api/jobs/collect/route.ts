import { NextResponse } from "next/server";
import { requireSchedulerSecret } from "@/lib/scheduler-auth";
import { runCollectJob } from "@/lib/collector";

// anyang-backend-api 5·7절 — 공지 수집기 잡. pg_cron이 5분 간격이 아닌 하루 1회 트리거한다.
export async function POST(request: Request) {
  const authError = requireSchedulerSecret(request);
  if (authError) return authError;

  const result = await runCollectJob("scheduled", null);
  if (!result.ok) {
    const status = result.reason === "ROBOTS_DISALLOWED" ? 409 : 500;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ collected_count: result.collectedCount });
}
