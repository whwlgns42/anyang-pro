import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveLandingPath } from "./_lib/session-guard";

// 루트 진입: 세션 유무·정지·재동의·프로필 완료 여부에 따라 적절한 화면으로 보낸다
// (anyang-frontend-screens 공통 레이아웃 절).
export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.suspended) {
    redirect("/suspended");
  }
  redirect(await resolveLandingPath(session.user.id));
}
