// anyang-frontend-screens 15-2·15-3절: 채팅 전송 실패 분류와 입력 글자 수 표시 판정.
export const CHAT_MAX_LENGTH = 2000;
export const COUNTER_FROM = 1800; // 90%

export type ChatFailureKind = "retry" | "limit" | "too-long" | "rejected" | "auth" | "gone" | "none";
export type ChatFailure = { kind: ChatFailureKind; message?: string; href?: string };

export const isJsonType = (contentType: string | null) => !!contentType && contentType.includes("application/json");

const KNOWN_403 = ["ACCOUNT_SUSPENDED", "CONSENT_REQUIRED", "ADMIN_ONLY"];

// status 0은 fetch 예외(네트워크). body는 JSON이 아니면 읽지 않는다(500·게이트웨이는 상태 코드로만 분기).
export function describeChatFailure(status: number, contentType: string | null, body: unknown): ChatFailure {
  const code = isJsonType(contentType) && body && typeof body === "object" ? (body as { error?: unknown }).error : undefined;
  if (status === 0 || status >= 500) return { kind: "retry" };
  if (status === 429) return { kind: "limit", message: "잠시 후 다시 시도해 주세요" };
  if (status === 401) return { kind: "auth", message: "로그인이 풀렸어요. 다시 로그인해 주세요.", href: "/login" };
  if (status === 404) return { kind: "gone", message: "이 대화를 찾을 수 없어요. 새 대화로 시작해 주세요." };
  if (status === 400 && code === "MESSAGE_TOO_LONG") {
    return { kind: "too-long", message: "메시지가 너무 길어요. 2,000자 이하로 줄여 주세요." };
  }
  // 알려진 403은 apiFetch가 화면을 옮기므로 안내를 띄우지 않는다.
  if (status === 403 && typeof code === "string" && KNOWN_403.includes(code)) return { kind: "none" };
  return { kind: "rejected", message: "메시지를 보내지 못했어요. 내용을 확인해 주세요." };
}

// null이면 표시 없음. length는 textarea maxLength와 같은 value.length.
export function counterView(length: number): { text: string; atLimit: boolean } | null {
  if (length < COUNTER_FROM) return null;
  return { text: `${length.toLocaleString("en-US")} / ${CHAT_MAX_LENGTH.toLocaleString("en-US")}`, atLimit: length >= CHAT_MAX_LENGTH };
}
