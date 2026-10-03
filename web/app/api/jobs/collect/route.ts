import { NextResponse } from "next/server";
import { requireSchedulerSecret } from "@/lib/scheduler-auth";
import { runCollectJob } from "@/lib/collector";
import { runEmbedJob } from "@/lib/embed-job";

// anyang-backend-api 5-1·7절 — 공지 수집기 잡. pg_cron이 mode=quick(10분마다)과 mode=full(하루 1회)로 호출한다.
// 수집이 끝나면 같은 요청 안에서 임베딩 파이프라인을 직접 호출한다(별도 엔드포인트 호출 없음).
// anyang-backend-api 10절 — Fluid Compute 함수 최대 300초 한도를 명시.
export const maxDuration = 300;

export async function POST(request: Request) {
  const authError = requireSchedulerSecret(request);
  if (authError) return authError;

  // mode가 없으면 full(기존 템플릿 호출과의 호환, 5-1절 6번).
  const mode = new URL(request.url).searchParams.get("mode") ?? "full";
  if (mode !== "quick" && mode !== "full") {
    return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
  }

  const result = await runCollectJob("scheduled", null, { mode });
  if (!result.ok) {
    // 겹침은 정상 건너뜀이라 200으로 돌려준다(pg_net 기록에서 오류처럼 보이지 않게). 임베딩은 호출하지 않는다.
    if (result.reason === "ALREADY_RUNNING") {
      return NextResponse.json({ mode, skipped: true, reason: "ALREADY_RUNNING" });
    }
    const status = result.reason === "ROBOTS_DISALLOWED" ? 409 : 500;
    return NextResponse.json({ error: result.reason }, { status });
  }

  try {
    await runEmbedJob();
  } catch (err) {
    // 임베딩 실패로 수집 잡 자체를 실패시키지 않는다 — 다음 실행에서 남은 대기열을 마저 처리한다.
    console.error("jobs/collect: embed job failed", err);
  }

  return NextResponse.json({ mode, collected_count: result.collectedCount });
}
