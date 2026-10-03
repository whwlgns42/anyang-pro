import { redirect } from "next/navigation";

// 기억 구역이 내 정보(/settings)로 옮겨졌다. 옛 주소는 그쪽으로 보낸다(인증 가드는 /settings가 한다).
export default function MemorySettingsPage() {
  redirect("/settings");
}
