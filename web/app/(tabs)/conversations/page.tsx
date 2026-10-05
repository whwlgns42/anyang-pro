import { requireSession } from "../../_lib/session-guard";
import { ConversationsClient } from "./conversations-client";

// anyang-frontend-screens 8절. userId는 삭제 때 같은 탭의 채팅 보관분을 지우는 데 쓴다(8-2절).
export default async function ConversationsPage() {
  const session = await requireSession({ requireProfile: true });
  return <ConversationsClient userId={session.user?.id ?? null} />;
}
