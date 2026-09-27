import type { ReactNode } from "react";

export const metadata = {
  title: "안양 청년정책 비서",
};

// ponytail: 최소 스캐폴딩만. 실제 레이아웃/스타일은 frontend 담당.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
