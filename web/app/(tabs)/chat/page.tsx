import { requireSession } from "../../_lib/session-guard";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  await requireSession({ requireProfile: true });
  return <ChatClient />;
}
