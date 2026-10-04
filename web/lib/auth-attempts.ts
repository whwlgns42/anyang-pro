import { createHash } from "node:crypto";
import { pool } from "./db";

// anyang-backend-api 1-6절(확인 항목 29) — auth_attempts 기반 로그인 실패·가입 시도 제한.
// 값은 확정(15분/5회), 구현 방식(해시·IP 추출·판정 위치)은 backend 제안(미확정).
export type AttemptType = "login_failure" | "signup_attempt" | "test_notify";
export type IdentifierType = "email" | "ip" | "user";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

function normalizedHash(identifierType: IdentifierType, identifier: string): string {
  const value = identifierType === "email" ? identifier.trim().toLowerCase() : identifier;
  return createHash("sha256").update(value).digest("hex");
}

// anyang-backend-api 1-6절 — Vercel 표준 x-forwarded-for 첫 값. 로컬 개발(헤더 없음)은 폴백.
export function extractIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "127.0.0.1";
}

export async function isBlocked(
  attemptType: AttemptType,
  identifierType: IdentifierType,
  identifier: string,
): Promise<boolean> {
  const hash = normalizedHash(identifierType, identifier);
  const { rows } = await pool.query<{ count: string }>(
    `select count(*)::text as count from auth_attempts
      where attempt_type = $1 and identifier_type = $2 and identifier_hash = $3
        and created_at > now() - interval '${WINDOW_MINUTES} minutes'`,
    [attemptType, identifierType, hash],
  );
  return Number(rows[0]?.count ?? 0) >= MAX_ATTEMPTS;
}

export async function recordAttempt(
  attemptType: AttemptType,
  identifierType: IdentifierType,
  identifier: string,
): Promise<void> {
  const hash = normalizedHash(identifierType, identifier);
  await pool.query(`insert into auth_attempts (attempt_type, identifier_type, identifier_hash) values ($1, $2, $3)`, [
    attemptType,
    identifierType,
    hash,
  ]);
}

// anyang-backend-api 8-1절(확인 항목 58) — 테스트 알림 사용자당 1분 1회. 슬롯 선점이 성공하면 true.
// 동시 두 요청이 모두 통과할 수 있다(락 없음, 설계상 수용).
export async function claimTestNotifySlot(userId: string): Promise<boolean> {
  const hash = createHash("sha256").update(userId).digest("hex");
  const result = await pool.query(
    `insert into auth_attempts (attempt_type, identifier_type, identifier_hash)
     select 'test_notify', 'user', $1
      where not exists (
        select 1 from auth_attempts
         where attempt_type = 'test_notify' and identifier_type = 'user' and identifier_hash = $1
           and created_at > now() - interval '1 minute')`,
    [hash],
  );
  return (result.rowCount ?? 0) > 0;
}
