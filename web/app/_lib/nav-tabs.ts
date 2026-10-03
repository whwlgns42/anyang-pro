import type { IconName } from "../_components/ui/icon";

// 청안 시안 순서: 대화·공지·알림·내 정보 (anyang-frontend-screens "공통 틀").
export const TABS = [
  { key: "chat", label: "대화", icon: "chat", href: "/chat" },
  { key: "notices", label: "공지", icon: "notices", href: "/notices" },
  { key: "alerts", label: "알림", icon: "bell", href: "/settings/notifications" },
  { key: "me", label: "내 정보", icon: "person", href: "/settings" },
] as const satisfies readonly { key: string; label: string; icon: IconName; href: string }[];

export type TabKey = (typeof TABS)[number]["key"];

function startsWithSegment(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

// 현재 경로가 어느 탭인지. 탭에 속하지 않는 경로는 null.
export function currentTab(pathname: string): TabKey | null {
  if (startsWithSegment(pathname, "/settings/notifications")) return "alerts";
  if (startsWithSegment(pathname, "/settings")) return "me";
  if (startsWithSegment(pathname, "/chat") || startsWithSegment(pathname, "/conversations")) return "chat";
  if (startsWithSegment(pathname, "/notices")) return "notices";
  return null;
}

// 공지 상세는 모바일·태블릿에서 하단 탭 바를 숨긴다(시안 03). 사이드바는 항상 보인다.
export function hidesTabBar(pathname: string): boolean {
  return /^\/notices\/[^/]+\/?$/.test(pathname);
}
