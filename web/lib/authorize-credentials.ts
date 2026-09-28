import { CredentialsSignin } from "@auth/core/errors";
import { pool } from "./db";
import { verifyPassword } from "./password";
import { extractIp, isBlocked, recordAttempt } from "./auth-attempts";

// anyang-backend-api 1-6절 — Auth.js authorize()의 error에 담을 커스텀 코드.
export class TooManyAttemptsSignin extends CredentialsSignin {
  code = "TOO_MANY_ATTEMPTS";
}

export type AuthorizedUser = { id: string; email: string };

// Credentials authorize()의 판정 로직만 분리해 Auth.js 부트스트랩 없이 테스트할 수 있게 한다.
export async function authorizeCredentials(
  email: string,
  password: string,
  request: Request,
): Promise<AuthorizedUser | null> {
  if (!email || !password) return null;

  const ip = extractIp(request);
  // anyang-backend-api 1-6절 — 비밀번호 대조 전에 이메일·IP 각각의 최근 15분 실패 횟수를 먼저
  // 확인한다. 계정 존재 여부와 무관하게 같은 응답(계정 열거 방지).
  const [emailBlocked, ipBlocked] = await Promise.all([
    isBlocked("login_failure", "email", email),
    isBlocked("login_failure", "ip", ip),
  ]);
  if (emailBlocked || ipBlocked) {
    throw new TooManyAttemptsSignin();
  }

  const { rows } = await pool.query<{ id: string; email: string; password_hash: string }>(
    `select u.id, u.email, c.password_hash
       from users u
       join credentials c on c.user_id = u.id
      where u.email = $1`,
    [email],
  );
  const row = rows[0];
  const ok = row ? await verifyPassword(row.password_hash, password) : false;

  if (!ok) {
    await Promise.all([recordAttempt("login_failure", "email", email), recordAttempt("login_failure", "ip", ip)]);
    return null;
  }

  return { id: row.id, email: row.email };
}
