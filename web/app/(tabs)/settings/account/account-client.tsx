"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog } from "../../../_components/ui/controls";
import { ScreenHeader } from "../../../_components/ui/screen";

// anyang-frontend-screens 8-1절 + 청안 적용 6번: 되돌릴 수 없는 동작이라 <dialog> 확인 후에만
// DELETE /api/account를 호출한다. 탈퇴는 정지·재동의 필요 상태에서도 호출 가능(backend 예외).
export function AccountClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.status !== 204) {
      setDeleting(false);
      setOpen(false);
      setError("탈퇴 처리 중 오류가 발생했습니다.");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <ScreenHeader title="계정 탈퇴" />
        <div className="flex flex-col items-start gap-4 px-gutter pb-6">
          <p className="m-0 text-body">
            탈퇴하면 프로필·대화·기억·알림 설정 등 계정 데이터는 즉시 삭제됩니다. 동의 기록은
            증빙용으로 1년간 보관된 뒤 삭제됩니다.
          </p>
          {error && (
            <p className="m-0 text-body-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          <Button variant="danger" onClick={() => setOpen(true)} disabled={deleting}>
            계정 탈퇴
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={open}
        title="탈퇴할까요?"
        description="대화 기록, AI가 기억한 내용, 프로필, 알림 설정이 지워져요. 동의 기록은 증빙을 위해 1년 보관한 뒤 지워요. 되돌릴 수 없어요."
        confirmLabel="탈퇴하기"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </main>
  );
}
