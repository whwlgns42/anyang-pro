import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveLandingPath } from "../_lib/session-guard";

// Google·Credentials 로그인 공통 착지 지점. 세션 확인 후 재동의/온보딩/채팅 중 어디로 보낼지
// resolveLandingPath로 판정한다(anyang-frontend-screens 1절).
export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.suspended) {
    redirect("/suspended");
  }
  redirect(await resolveLandingPath(session.user.id));
}
