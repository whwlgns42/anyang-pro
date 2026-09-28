import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SuspendedActions } from "./suspended-actions";
import { AuthLayout } from "../_lib/auth-layout";

// anyang-frontend-screens 1절/공통 레이아웃 절: 정지 계정 안내. 세션은 유지한 채(로그아웃하지
// 않음) 로그아웃·탈퇴 외 동작을 막는다. 정지가 아닌 사용자가 직접 접근하면 바로 내보낸다.
export default async function SuspendedPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!session.suspended) {
    redirect("/post-login");
  }
  return (
    <AuthLayout>
      <h1>이용이 정지된 계정입니다</h1>
      <p>
        이 계정은 이용이 정지되어 서비스를 사용할 수 없습니다. 문의가 필요하면 관리자에게
        연락해 주세요.
      </p>
      <SuspendedActions />
    </AuthLayout>
  );
}
