import { timingSafeEqual } from "node:crypto";

// anyang-backend-api 7절 — 공유 시크릿 인증. /api/jobs/* 라우트(2차 이후 구현)가 이 헬퍼를
// 공통으로 쓴다. 이번 1차 묶음에는 아직 소비하는 라우트가 없다.
export function verifySchedulerSecret(request: Request): boolean {
  const expected = process.env.SCHEDULER_SHARED_SECRET;
  if (!expected) return false;

  const provided = request.headers.get("x-scheduler-secret") ?? "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;

  return timingSafeEqual(expectedBuf, providedBuf);
}

export function requireSchedulerSecret(request: Request): Response | null {
  if (!verifySchedulerSecret(request)) {
    return new Response(null, { status: 401 });
  }
  return null;
}
