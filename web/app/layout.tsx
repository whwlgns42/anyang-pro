import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./_components/providers";
import { RegisterServiceWorker } from "./_components/register-sw";

export const metadata = {
  title: "안양 청년정책 비서",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <RegisterServiceWorker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
