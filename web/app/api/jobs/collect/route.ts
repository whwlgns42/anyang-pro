import { NextResponse } from "next/server";
import { requireBackfillSecret, requireSchedulerSecret } from "@/lib/scheduler-auth";
import { runCollectJob } from "@/lib/collector";
import { countUnembedded, runEmbedJob } from "@/lib/embed-job";

// anyang-backend-api 5-1·7절 — 공지 수집기 잡. pg_cron이 mode=quick(10분마다)과 mode=full(하루 1회)로 호출한다.
// mode=backfill은 사용자가 수동으로 분할 호출하는 일회성 전체 수집이다(5-1절 7번).
// 수집이 끝나면 같은 요청 안에서 임베딩 파이프라인을 직접 호출한다(별도 엔드포인트 호출 없음).
// anyang-backend-api 10절 — Fluid Compute 함수 최대 300초 한도를 명시.
export const maxDuration = 300;

const BACKFILL_LAST_PAGE = 47;
const BACKFILL_MAX_PAGES = 5;
// 요청 시작 후 이 시간이 지나면 다음 임베딩 반복을 시작하지 않는다(maxDuration 300초 기준).
const BACKFILL_EMBED_BUDGET_MS = 200_000; // user 확정(승인 21차)

// 양의 정수 문자열만 허용한다(null·빈 값·소수·부호 불가).
function parsePage(value: string | null): number | null {
  return value !== null && /^\d+$/.test(value) ? Number(value) : null;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  // mode가 없으면 full(기존 템플릿 호출과의 호환, 5-1절 6번).
  const mode = url.searchParams.get("mode") ?? "full";
  const isBackfill = mode === "backfill";

  // backfill은 x-backfill-secret만, 나머지는 x-scheduler-secret만 받는다. 인증이 mode 검사보다 먼저.
  const authError = isBackfill ? requireBackfillSecret(request) : requireSchedulerSecret(request);
  if (authError) return authError;

  if (mode !== "quick" && mode !== "full" && !isBackfill) {
    return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
  }

  let opts: Parameters<typeof runCollectJob>[2] = { mode: mode as "quick" | "full" };
  if (isBackfill) {
    const from = parsePage(url.searchParams.get("from"));
    const to = parsePage(url.searchParams.get("to"));
    if (
      from === null ||
      to === null ||
      from < 1 ||
      to > BACKFILL_LAST_PAGE ||
      from > to ||
      to - from + 1 > BACKFILL_MAX_PAGES
    ) {
      return NextResponse.json({ error: "INVALID_RANGE" }, { status: 400 });
    }
    opts = { mode: "backfill", fromPage: from, toPage: to, skipExisting: true };
  }

  const result = await runCollectJob("scheduled", null, opts);
  if (!result.ok) {
    // 겹침은 정상 건너뜀이라 200으로 돌려준다(pg_net 기록에서 오류처럼 보이지 않게). 임베딩은 호출하지 않는다.
    if (result.reason === "ALREADY_RUNNING") {
      return NextResponse.json({ mode, skipped: true, reason: "ALREADY_RUNNING" });
    }
    const status = result.reason === "ROBOTS_DISALLOWED" ? 409 : 500;
    return NextResponse.json({ error: result.reason }, { status });
  }

  try {
    if (isBackfill) {
      // 대기열이 비거나(embedded_chunks === 0) 시간 예산에 닿을 때까지 반복한다.
      while (Date.now() - startedAt < BACKFILL_EMBED_BUDGET_MS) {
        const r = await runEmbedJob();
        if (r.embedded_chunks === 0) break;
      }
    } else {
      await runEmbedJob();
    }
  } catch (err) {
    // 임베딩 실패로 수집 잡 자체를 실패시키지 않는다 — 다음 실행에서 남은 대기열을 마저 처리한다.
    console.error("jobs/collect: embed job failed", err);
  }

  if (!isBackfill) return NextResponse.json({ mode, collected_count: result.collectedCount });

  let remaining: number | null = null;
  try {
    remaining = await countUnembedded();
  } catch (err) {
    console.error("jobs/collect: countUnembedded failed", err);
  }
  return NextResponse.json({ mode, collected_count: result.collectedCount, remaining_unembedded: remaining });
}
