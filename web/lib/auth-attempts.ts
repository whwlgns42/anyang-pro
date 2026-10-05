import { createHash } from "node:crypto";
import { pool } from "./db";

// anyang-backend-api 1-6절(확인 항목 29) — auth_attempts 기반 로그인 실패·가입 시도 제한.
// 값은 확정(15분/5회), 구현 방식(해시·IP 추출·판정 위치)은 backend 제안(미확정).
export type AttemptType = "login_failure" | "signup_attempt" | "test_notify" | "chat_request";
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

// anyang-backend-api 3-4-2절(확인 항목 63) — 채팅 사용자당 1분 5회·24시간 100회. 사용자별 advisory 락으로
// 판정·삽입을 직렬화해 동시 연타가 한도를 뚫지 못하게 한다. 락은 commit까지(수 ms)만 잡는다.
// 거절이면 행을 남기지 않는다. DB 오류는 던진다(제한 장애 시 열어 두지 않고 막는다).
export type ChatSlotResult = { ok: true } | { ok: false; limit: "minute" | "day" };

export async function claimChatSlot(userId: string): Promise<ChatSlotResult> {
  const hash = createHash("sha256").update(userId).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtextextended('chat_request:' || $1::text, 0))`, [hash]);
    const inserted = await client.query(
      `insert into auth_attempts (attempt_type, identifier_type, identifier_hash)
       select 'chat_request', 'user', $1::text
        where (select count(*) from auth_attempts
                where attempt_type = 'chat_request' and identifier_type = 'user' and identifier_hash = $1
                  and created_at > now() - interval '1 minute') < 5
          and (select count(*) from auth_attempts
                where attempt_type = 'chat_request' and identifier_type = 'user' and identifier_hash = $1
                  and created_at > now() - interval '24 hours') < 100`,
      [hash],
    );
    if ((inserted.rowCount ?? 0) > 0) {
      await client.query("commit");
      return { ok: true };
    }
    const { rows } = await client.query<{ d: string }>(
      `select count(*)::text as d from auth_attempts
        where attempt_type = 'chat_request' and identifier_type = 'user' and identifier_hash = $1
          and created_at > now() - interval '24 hours'`,
      [hash],
    );
    await client.query("commit");
    return { ok: false, limit: Number(rows[0]?.d ?? 0) >= 100 ? "day" : "minute" };
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
