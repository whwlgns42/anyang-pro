import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { CONSENT_TYPES, POLICY_VERSION } from "@/lib/consent";
import type { Session } from "next-auth";

// 서버 컴포넌트 전용 인증 가드(anyang-frontend-screens 공통 레이아웃 절).
// - 세션 없음 → /login
// - 정지 계정(session.suspended) → /suspended (탈퇴 화면은 요청하지 않는다, requireProfile 무관)
// - requireProfile: true → 프로필 없으면 /onboarding (backend GET /api/profile 404/빈 값과 동등한
//   판정을 직접 조회한다 — 서버 컴포넌트가 자기 자신에게 내부 HTTP를 다시 보내지 않기 위함, YAGNI).
export type RequireSessionOptions = {
  requireProfile?: boolean;
  allowSuspended?: boolean;
};

export async function requireSession(options: RequireSessionOptions = {}): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.suspended && !options.allowSuspended) {
    redirect("/suspended");
  }
  if (options.requireProfile) {
    const { rows } = await pool.query("select 1 from profiles where user_id = $1", [
      session.user.id,
    ]);
    if (rows.length === 0) {
      redirect("/onboarding");
    }
  }
  return session;
}

// 로그인 직후(Google/Credentials 공통) 어디로 보낼지 판정한다: 재동의 필요 → /consent,
// 프로필 없음 → /onboarding, 둘 다 아니면 → /chat. requireUser의 재동의 판정과 동일 기준
// (consents.policy_version 최신 여부)을 직접 조회한다(자기 자신에게 내부 HTTP 왕복하지 않기 위함).
export async function resolveLandingPath(userId: string): Promise<string> {
  for (const type of CONSENT_TYPES) {
    const { rows } = await pool.query<{ policy_version: string }>(
      `select policy_version from consents
        where user_id = $1 and consent_type = $2 and withdrawn_at is null
        order by consented_at desc
        limit 1`,
      [userId, type],
    );
    if (rows[0]?.policy_version !== POLICY_VERSION) {
      return "/consent";
    }
  }
  const { rows: profileRows } = await pool.query("select 1 from profiles where user_id = $1", [
    userId,
  ]);
  return profileRows.length > 0 ? "/chat" : "/onboarding";
}
