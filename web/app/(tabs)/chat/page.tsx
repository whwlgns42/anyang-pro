import { requireSession } from "../../_lib/session-guard";
import { ChatClient } from "./chat-client";

type Props = { searchParams: Promise<{ conversation_id?: string }> };

// anyang-frontend-screens 3절: ?conversation_id=...로 들어오면 과거 대화를 이어서 연다
// (8절 대화 히스토리 목록에서 진입).
export default async function ChatPage({ searchParams }: Props) {
  const session = await requireSession({ requireProfile: true });
  const { conversation_id } = await searchParams;
  return <ChatClient initialConversationId={conversation_id ?? null} userId={session.user?.id ?? null} />;
}
