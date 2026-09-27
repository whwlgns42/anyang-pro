"use client";

import { useEffect } from "react";

// anyang-frontend-screens "PWA — manifest·서비스워커" 절: 루트 레이아웃에서 1회 등록.
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("서비스워커 등록 실패", err);
      });
    }
  }, []);
  return null;
}
