"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, currentTab, hidesTabBar } from "../_lib/nav-tabs";
import { Icon } from "./ui/icon";

// 하단 탭 바(< 1200px). 사이드바와 같은 TABS 배열을 쓴다.
export function TabBar() {
  const pathname = usePathname();
  if (hidesTabBar(pathname)) return null;
  const current = currentTab(pathname);
  return (
    <nav
      aria-label="주 메뉴"
      className="grid shrink-0 grid-cols-4 border-t border-rule bg-paper px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+8px)] desktop:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-13 flex-col items-center justify-center gap-[3px] text-tab no-underline ${
              active ? "font-semibold text-accent" : "text-ink-3"
            }`}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// 데스크톱(>= 1200px) 왼쪽 사이드바 240px.
export function Sidebar() {
  const current = currentTab(usePathname());
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-rule desktop:flex">
      <div className="px-gutter pt-8 pb-6 font-display text-display-sm">청안</div>
      <nav aria-label="주 메뉴" className="flex flex-col gap-1 px-3">
        {TABS.map((tab) => {
          const active = tab.key === current;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-touch items-center gap-3 rounded-control px-3 text-title no-underline ${
                active ? "font-semibold text-accent" : "font-normal text-ink-2"
              }`}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
