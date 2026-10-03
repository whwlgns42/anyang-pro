import type { ReactNode } from "react";
import { requireSession } from "../_lib/session-guard";
import { AdminNav } from "./admin-nav";

// anyang-frontend-screens 10절/공통 레이아웃 절: 관리자 판정은 서버가 한다. 여기서는
// 로그인 여부만 확인하고("세션 없음 → /login"), 관리자인지(ADMIN_EMAILS + 이번 로그인이
// Google인지)는 각 하위 화면이 실제 관리자 API를 호출한 응답 코드(401/403 ADMIN_ONLY)로만
// 판단한다(공통 apiFetch가 403을 감지해 /chat으로 돌려보낸다) — 별도 "관리자인지" 확인용
// API를 새로 만들지 않는다(YAGNI, 화면 설계 그대로).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-admin flex-col">
      <AdminNav />
      {children}
    </div>
  );
}
