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

export function requireBackfillSecret(request: Request): Response | null {
  return verifyBackfillSecret(request) ? null : new Response(null, { status: 401 });
}

// /api/jobs/embed — 둘 중 하나만 맞아도 통과.
export function requireSchedulerOrBackfillSecret(request: Request): Response | null {
  return verifySchedulerSecret(request) || verifyBackfillSecret(request) ? null : new Response(null, { status: 401 });
}
