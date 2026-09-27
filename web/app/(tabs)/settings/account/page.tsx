import { requireSession } from "../../../_lib/session-guard";
import { AccountClient } from "./account-client";

// anyang-frontend-screens 8-1절: 정지·재동의 필요 상태에서도 접근·탈퇴가 가능해야 하므로
// allowSuspended: true, requireProfile은 두지 않는다.
export default async function AccountSettingsPage() {
  await requireSession({ allowSuspended: true });
  return <AccountClient />;
}
