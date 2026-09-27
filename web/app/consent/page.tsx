import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ConsentForm } from "./consent-form";

// anyang-frontend-screens 7절. 세션은 필요하지만(재동의·Google 신규 가입 모두 로그인 상태)
// 동의 여부 자체는 이 화면이 확인시키는 대상이므로 requireSession의 프로필/consent 체크는
// 쓰지 않는다(정지 계정도 이 화면 접근은 허용 — backend 1절 예외와 동일 원칙).
export default async function ConsentPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <ConsentForm />;
}
