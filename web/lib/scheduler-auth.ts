import { timingSafeEqual } from "node:crypto";

// anyang-backend-api 7절 — 공유 시크릿 인증. /api/jobs/* 라우트가 이 헬퍼를 공통으로 쓴다.
function verifyHeaderSecret(request: Request, header: string, expected: string | undefined): boolean {
  if (!expected) return false;

  const provided = request.headers.get(header) ?? "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;

  return timingSafeEqual(expectedBuf, providedBuf);
}

export function verifySchedulerSecret(request: Request): boolean {
  return verifyHeaderSecret(request, "x-scheduler-secret", process.env.SCHEDULER_SHARED_SECRET);
}

// anyang-backend-api 5-1절 7번 — 일회성 백필 시크릿. BACKFILL_SECRET이 비면 항상 false(모드 비활성).
export function verifyBackfillSecret(request: Request): boolean {
  return verifyHeaderSecret(request, "x-backfill-secret", process.env.BACKFILL_SECRET);
}

export function requireSchedulerSecret(request: Request): Response | null {
  if (!verifySchedulerSecret(request)) {
    return new Response(null, { status: 401 });
  }
  return null;
}

// anyang-backend-api 7-1절 — 알림 잡 트리거 전용 키. NOTIFY_TRIGGER_SECRET이 비면 항상 false.
export function verifyNotifyTriggerSecret(request: Request): boolean {
  return verifyHeaderSecret(request, "x-notify-secret", process.env.NOTIFY_TRIGGER_SECRET);
}

// /api/jobs/notify 전용 — 스케줄러 키 또는 notify 키. 다른 잡 라우트는 새 키를 모른다.
export function requireNotifyJobSecret(request: Request): Response | null {
  return verifySchedulerSecret(request) || verifyNotifyTriggerSecret(request) ? null : new Response(null, { status: 401 });
}

export function requireBackfillSecret(request: Request): Response | null {
  return verifyBackfillSecret(request) ? null : new Response(null, { status: 401 });
}


// anyang-board-collector C-1 — 보드 수집기 전용 키. COLLECTOR_INGEST_SECRET이 비면 항상 false(받기 API 비활성).
export function verifyCollectorSecret(request: Request): boolean {
  return verifyHeaderSecret(request, "x-collector-secret", process.env.COLLECTOR_INGEST_SECRET);
}

export function requireCollectorSecret(request: Request): Response | null {
  return verifyCollectorSecret(request) ? null : new Response(null, { status: 401 });
}

// /api/jobs/embed (C-5) — 스케줄러·백필·보드 키 셋 중 하나만 맞아도 통과.
export function requireAnyJobSecret(request: Request): Response | null {
  return verifySchedulerSecret(request) || verifyBackfillSecret(request) || verifyCollectorSecret(request)
    ? null
    : new Response(null, { status: 401 });
}
