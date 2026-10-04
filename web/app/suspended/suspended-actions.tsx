"use client";

import { signOut } from "next-auth/react";
import { browserStorage, clearAllChatSnapshots } from "../_lib/chat-snapshot";
import { useRouter } from "next/navigation";

export function SuspendedActions() {
  const router = useRouter();

  async function handleLogout() {
    await signOut({ redirect: false });
    clearAllChatSnapshots(browserStorage());
    router.push("/login");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
      <button type="button" onClick={handleLogout} className="secondary">
        로그아웃
      </button>
      <button type="button" onClick={() => router.push("/settings/account")} className="danger">
        계정 탈퇴
      </button>
    </div>
  );
}
