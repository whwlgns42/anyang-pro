"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/collect-runs", label: "공지 수집" },
  { href: "/admin/notify-logs", label: "알림 발송" },
  { href: "/admin/users", label: "사용자·통계" },
  { href: "/admin/api-usage", label: "API 사용량" },
];

// anyang-frontend-screens 10절: 관리자 화면 4종을 잇는 상단 탭. 데스크톱 전용 레이아웃을
// 새로 만들지 않고 기존 공통 레이아웃(중앙 정렬 고정폭)을 그대로 쓴다(YAGNI).
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      className="bottom-nav"
      aria-label="관리자 메뉴"
      style={{ position: "static", borderTop: "none", borderBottom: "1px solid var(--border)" }}
    >
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="bottom-nav__item"
          aria-current={pathname.startsWith(tab.href) ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
