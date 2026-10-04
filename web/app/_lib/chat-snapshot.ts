// anyang-frontend-screens 3-1절(확인 항목 60): 채팅 뒤로가기 시 대화·인용 유지.
// 같은 탭 sessionStorage 보관분을 읽고 쓰는 순수 함수. 저장소는 인자로 받아 브라우저 없이 테스트한다.
// 모든 접근은 try/catch로 감싼다 — 실패하면 보관분이 없는 것과 같게 다룬다(서버 복원 경로가 이어받는다).

import type { Citation } from "./chat-stream";

export type SnapshotMessage = { role: "user" | "assistant"; content: string; citations?: Citation[] };
export type Snapshot = {
  v: 1;
  savedAt: number;
  messages: SnapshotMessage[];
  scrollTop: number;
  atBottom: boolean;
  streaming: boolean;
};
export type SnapshotStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export const PREFIX = "anyang:chat:v1:";
export const MAX_CHARS = 200_000;
export const MAX_CONVERSATIONS = 10;

export function snapshotKey(userId: string, conversationId: string): string {
  return `${PREFIX}${userId}:${conversationId}`;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function isMessage(m: unknown): m is SnapshotMessage {
  if (typeof m !== "object" || m === null) return false;
  const o = m as Record<string, unknown>;
  return (
    (o.role === "user" || o.role === "assistant") &&
    typeof o.content === "string" &&
    (o.citations === undefined || Array.isArray(o.citations))
  );
}

function parse(raw: string | null): Snapshot | null {
  if (raw === null) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (
      o.v !== 1 ||
      typeof o.savedAt !== "number" ||
      !Array.isArray(o.messages) ||
      !o.messages.every(isMessage) ||
      typeof o.scrollTop !== "number" ||
      typeof o.atBottom !== "boolean" ||
      typeof o.streaming !== "boolean"
    ) {
      return null;
    }
    return o as unknown as Snapshot;
  } catch {
    return null;
  }
}

// 모양이 어긋나거나 깨졌으면 null이고 그 키를 지운다.
export function readSnapshot(
  storage: SnapshotStorage | null,
  userId: string,
  conversationId: string,
): Snapshot | null {
  if (!storage) return null;
  const key = snapshotKey(userId, conversationId);
  const snap = safe(() => parse(storage.getItem(key)), null);
  if (!snap) safe(() => storage.removeItem(key), undefined);
  return snap;
}

// 글자 수 합이 상한을 넘으면 오래된 메시지부터 버리고, 맨 앞이 assistant만 남지 않게 한다.
export function trimMessages(messages: SnapshotMessage[], maxChars = MAX_CHARS): SnapshotMessage[] {
  let total = messages.reduce((n, m) => n + m.content.length, 0);
  let start = 0;
  while (total > maxChars && start < messages.length) total -= messages[start++].content.length;
  while (start < messages.length && messages[start].role === "assistant") {
    total -= messages[start++].content.length;
  }
  return messages.slice(start);
}

function allKeys(storage: SnapshotStorage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  return keys;
}

// 가장 오래된 보관분 하나를 지운다(except 키는 제외). 지울 것이 없으면 false.
function evictOldest(storage: SnapshotStorage, except?: string): boolean {
  let oldest: { key: string; at: number } | null = null;
  for (const key of allKeys(storage)) {
    if (key === except) continue;
    const at = parse(storage.getItem(key))?.savedAt ?? -1; // 깨진 것은 가장 먼저 지운다
    if (!oldest || at < oldest.at) oldest = { key, at };
  }
  if (!oldest) return false;
  storage.removeItem(oldest.key);
  return true;
}

export function writeSnapshot(
  storage: SnapshotStorage | null,
  userId: string,
  conversationId: string,
  data: Omit<Snapshot, "v" | "savedAt">,
  now = Date.now(),
): void {
  if (!storage) return;
  const messages = trimMessages(data.messages);
  if (messages.length === 0) return; // 빈 상태는 보관하지 않는다
  const key = snapshotKey(userId, conversationId);
  const value = JSON.stringify({ ...data, messages, v: 1, savedAt: now });
  safe(() => {
    try {
      storage.setItem(key, value);
    } catch {
      // 용량 오류: 다른 대화 중 가장 오래된 것을 지우고 한 번만 다시 시도한다.
      if (evictOldest(storage, key)) storage.setItem(key, value);
    }
    while (allKeys(storage).length > MAX_CONVERSATIONS && evictOldest(storage, key)) {
      // 한 개씩 지우며 반복
    }
  }, undefined);
}

export function removeSnapshot(storage: SnapshotStorage | null, userId: string, conversationId: string): void {
  if (storage) safe(() => storage.removeItem(snapshotKey(userId, conversationId)), undefined);
}

// 로그아웃·탈퇴 때 같은 탭의 모든 채팅 보관분을 지운다(다른 키는 남긴다).
export function clearAllChatSnapshots(storage: SnapshotStorage | null): void {
  if (!storage) return;
  safe(() => {
    for (const k of allKeys(storage)) storage.removeItem(k);
  }, undefined);
}

export function browserStorage(): SnapshotStorage | null {
  return safe(() => (typeof window === "undefined" ? null : window.sessionStorage), null);
}

// 스트리밍 중에 보관한 분을 서버 목록과 합친다. 서버가 보관분 이상이면 서버 목록에 인용을 옮겨 붙이고,
// 적으면 보관분 그대로 두고 interrupted(중간 멈춤 표시)를 켠다.
export function mergeStreamingSnapshot(
  snap: SnapshotMessage[],
  server: { role: string; content: string }[],
): { messages: SnapshotMessage[]; interrupted: boolean; streaming: boolean } {
  const rows = server.filter((m) => m.role === "user" || m.role === "assistant") as SnapshotMessage[];
  if (rows.length < snap.length) return { messages: snap, interrupted: true, streaming: true }; // 서버가 나중에 답변을 남길 수 있어 다음 복원 때 다시 조회한다
  // 보관분은 상한으로 앞쪽이 잘렸을 수 있어 꼬리 기준으로 맞춘다(서버가 같은 끝을 가진다).
  const offset = rows.length - snap.length;
  const messages = rows.map((m, i) => {
    const s = snap[i - offset];
    const citations = s?.role === "assistant" && m.role === "assistant" ? s.citations : undefined;
    return citations ? { role: m.role, content: m.content, citations } : { role: m.role, content: m.content };
  });
  return { messages, interrupted: false, streaming: false };
}

// 서버 조회 실패 분기(3-1절 5번 ③): status가 null이면 네트워크 예외. 404(삭제된 대화)만 보관분을 지운다.
export function onLoadFailure(status: number | null): "show" | "delete" {
  return status === 404 ? "delete" : "show";
}

// 스크롤 효과 판정: 복원 대기값(pending)은 목록이 채워진 뒤에만 소모한다(errors/anyang-chat-snapshot-scroll-restore-order).
export function scrollTarget(
  pending: { scrollTop: number; atBottom: boolean } | null,
  messageCount: number,
  scrollHeight: number,
): { top: number; consumed: boolean } {
  if (pending && messageCount === 0) return { top: scrollHeight, consumed: false };
  return { top: pending && !pending.atBottom ? pending.scrollTop : scrollHeight, consumed: true };
}
