import { requireSession } from "../../../_lib/session-guard";
import { MemoryClient } from "./memory-client";

// anyang-frontend-screens 6절. 프로필 없이도 접근 자체는 가능하지만(기억이 없을 뿐) 다른
// 설정 화면과 동일하게 requireProfile을 둔다 — 온보딩 전 사용자는 애초에 대화가 없어 기억도 없다.
export default async function MemorySettingsPage() {
  await requireSession({ requireProfile: true });
  return <MemoryClient />;
}
