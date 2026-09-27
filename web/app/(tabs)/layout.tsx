import type { ReactNode } from "react";
import { BottomNav } from "../_components/bottom-nav";

// anyang-frontend-screens 공통 레이아웃 절: 로그인 후 화면에만 하단 탭을 둔다.
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      {children}
      <BottomNav />
    </div>
  );
}
