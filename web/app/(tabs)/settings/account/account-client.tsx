"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// anyang-frontend-screens 8-1절: 되돌릴 수 없는 동작이라 window.confirm으로 확인 후에만
// DELETE /api/account를 호출한다. 탈퇴는 정지·재동의 필요 상태에서도 호출 가능(backend 예외).
export function AccountClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "정말 탈퇴하시겠습니까? 프로필·대화·기억·알림 설정은 즉시 삭제되고, 동의 기록은 증빙용으로 1년간 보관된 뒤 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
    );
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.status !== 204) {
      setDeleting(false);
      setError("탈퇴 처리 중 오류가 발생했습니다.");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="page">
      <h1>계정 탈퇴</h1>
      <p>
        탈퇴하면 프로필·대화·기억·알림 설정 등 계정 데이터는 즉시 삭제됩니다. 동의 기록은
        증빙용으로 1년간 보관된 뒤 삭제됩니다.
      </p>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="danger" onClick={handleDelete} disabled={deleting}>
        계정 탈퇴
      </button>
    </main>
  );
}
