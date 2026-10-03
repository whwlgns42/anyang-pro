import { requireSession } from "../../_lib/session-guard";
import { ScreenHeader } from "../../_components/ui/screen";
import { MemoryClient } from "./memory/memory-client";
import { AccountLinks, ProfileSection } from "./profile-section";

// anyang-frontend-screens "청안 디자인 적용 화면 스펙" 5번: 내 정보(탭). 기억 구역·프로필·링크 목록.
export default async function SettingsPage() {
  await requireSession({ requireProfile: true });
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <ScreenHeader title="내 정보" />
        <div className="flex flex-col gap-7 px-gutter pb-6">
          <MemoryClient />
          <ProfileSection />
          <AccountLinks />
        </div>
      </div>
    </main>
  );
}
