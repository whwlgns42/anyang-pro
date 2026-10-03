import type { ReactNode } from "react";
import { Hahmlet, IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "./_components/providers";
import { RegisterServiceWorker } from "./_components/register-sw";

// 청안 토큰의 --font-display/--font-sans/--font-mono 이름을 그대로 덮어쓴다.
const display = Hahmlet({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const sans = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "안양 청년정책 비서",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#F5F3ED",
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <RegisterServiceWorker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
