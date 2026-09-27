import { auth } from "./auth";
import { isAdminEmail } from "./admin-emails";

export type AdminContext = { userId: string; email: string };

function errorResponse(status: number, body?: Record<string, unknown>): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
}

// anyang-backend-api 13-0절 — 관리자 공통 인가. accounts 테이블 조회가 아니라 이번 로그인의
// JWT provider 클레임(session.provider)만 본다: provider가 google이고 세션 이메일이
// ADMIN_EMAILS에 있을 때만 통과한다. credentials 로그인은 이메일이 일치해도 항상 거부한다.
export async function requireAdmin(): Promise<AdminContext | Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return errorResponse(401);
  }

  const email = session?.user?.email ?? "";
  if (session?.provider !== "google" || !isAdminEmail(email)) {
    return errorResponse(403, { error: "ADMIN_ONLY" });
  }

  return { userId, email };
}
