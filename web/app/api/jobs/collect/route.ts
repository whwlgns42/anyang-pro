import { NextResponse } from "next/server";
import { requireSchedulerSecret } from "@/lib/scheduler-auth";
import { runCollectJob } from "@/lib/collector";
import { runEmbedJob } from "@/lib/embed-job";

// anyang-backend-api 5·7절 — 공지 수집기 잡. pg_cron이 5분 간격이 아닌 하루 1회 트리거한다.
// 7절 표 "제안: 수집 잡 직후" — 별도 엔드포인트 호출 없이 같은 요청 안에서 임베딩 파이프라인을
// 직접 호출한다(pg_cron 잡을 추가로 등록하지 않는다).
export async function POST(request: Request) {
  const authError = requireSchedulerSecret(request);
  if (authError) return authError;

  const result = await runCollectJob("scheduled", null);
  if (!result.ok) {
    const status = result.reason === "ROBOTS_DISALLOWED" ? 409 : 500;
    return NextResponse.json({ error: result.reason }, { status });
  }

  try {
    await runEmbedJob();
  } catch (err) {
    // 임베딩 실패로 수집 잡 자체를 실패시키지 않는다 — 다음 실행에서 남은 대기열을 마저 처리한다.
    console.error("jobs/collect: embed job failed", err);
  }

  return NextResponse.json({ collected_count: result.collectedCount });
}
