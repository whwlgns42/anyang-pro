import type { ReactNode } from "react";
import { Sidebar, TabBar } from "../_components/app-nav";

// anyang-cheongan-design-adoption 6절: h-dvh 세로 틀. 모바일·태블릿은 하단 탭 바,
// 데스크톱(1200 이상)은 왼쪽 사이드바. 콘텐츠 열은 가운데 정렬 최대 720px.
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh bg-paper text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-column flex-1 flex-col">{children}</div>
        <TabBar />
      </div>
    </div>
  );
}
