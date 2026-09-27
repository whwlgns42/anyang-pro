"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/chat", label: "채팅", match: "/chat" },
  { href: "/notices", label: "공지 피드", match: "/notices" },
  { href: "/settings/notifications", label: "설정", match: "/settings" },
];

// anyang-frontend-screens 공통 레이아웃 절: 하단 탭(채팅/공지 피드/설정).
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {TABS.map((tab) => {
        const active = pathname === tab.match || pathname.startsWith(`${tab.match}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="bottom-nav__item"
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
