import { auth } from "./auth";
import { pool } from "./db";
import { CONSENT_TYPES, POLICY_VERSION } from "./consent";

export type AuthContext = { userId: string; email: string };

function errorResponse(status: number, body?: Record<string, unknown>): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
}

export type RequireUserOptions = {
  // anyang-backend-api 1-2절: /api/admin/* 와 DELETE /api/account만 정지 확인을 건너뛴다.
  skipSuspended?: boolean;
  // anyang-backend-api 1절: /api/auth/*, /api/auth/consent, /api/admin/*, DELETE /api/account는
  // 재동의 확인을 건너뛴다.
  skipConsent?: boolean;
};

// anyang-backend-api 1절·1-2절 공통 인증 헬퍼. 인증이 필요한 API 라우트가 맨 앞에서 호출한다.
export async function requireUser(options: RequireUserOptions = {}): Promise<AuthContext | Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return errorResponse(401);
  }

  if (!options.skipSuspended) {
    const { rows } = await pool.query<{ suspended_at: Date | null }>(
      `select suspended_at from users where id = $1`,
      [userId],
    );
    if (rows[0]?.suspended_at) {
      return errorResponse(403, { error: "ACCOUNT_SUSPENDED" });
    }
  }

  if (!options.skipConsent) {
    const missing: string[] = [];
    for (const type of CONSENT_TYPES) {
      const { rows } = await pool.query<{ policy_version: string }>(
        `select policy_version from consents
          where user_id = $1 and consent_type = $2 and withdrawn_at is null
          order by consented_at desc
          limit 1`,
        [userId, type],
      );
      if (rows[0]?.policy_version !== POLICY_VERSION) {
        missing.push(type);
      }
    }
    if (missing.length > 0) {
      return errorResponse(403, { error: "CONSENT_REQUIRED", missing });
    }
  }

  return { userId, email: session?.user?.email ?? "" };
}
