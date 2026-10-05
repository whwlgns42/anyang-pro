import { apiFetch } from "./api-fetch";
import { browserStorage, removeSnapshot, type SnapshotStorage } from "./chat-snapshot";

type Deps = {
  fetcher?: typeof apiFetch;
  storage?: SnapshotStorage | null;
  keepalive?: boolean;
};

// DELETE /api/conversations/{id}. 204만 성공이고 그때만 같은 탭의 채팅 보관분을 지운다(안 지우면
// 뒤로가기 때 지운 대화가 보관분에서 다시 보인다). 그 밖은 던져서 호출한 쪽이 항목을 되살리게 한다.
export async function deleteConversation(
  id: string,
  userId: string | null,
  { fetcher = apiFetch, storage, keepalive = false }: Deps = {},
): Promise<void> {
  const res = await fetcher(`/api/conversations/${id}`, { method: "DELETE", keepalive });
  if (res.status !== 204) throw new Error(String(res.status));
  if (userId) removeSnapshot(storage === undefined ? browserStorage() : storage, userId, id);
}
