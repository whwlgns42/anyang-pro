import { requireSession } from "../../_lib/session-guard";
import { ConversationsClient } from "./conversations-client";

// anyang-frontend-screens 8절.
export default async function ConversationsPage() {
  await requireSession({ requireProfile: true });
  return <ConversationsClient />;
}
