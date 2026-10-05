"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type SheetProps = { open: boolean; title: string; onClose: () => void; children: ReactNode };

// 바텀시트(1200px 이상은 사이드바 옆 가운데 모달). 네이티브 <dialog>라 showModal()이 뒷배경을 비활성으로
// 만들고 Tab을 안에 가둔다. Esc는 상태를 한 곳(onClose)에서만 바꾸려고 가로챈다.
// dialog 자체에는 패딩을 두지 않는다(바깥 클릭 판정: e.target === dialog). 열 때 움직임은 globals.css의 .sheet.
export function Sheet({ open, title, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
      // 브라우저별 차이 대비: 열기 전 요소가 아직 문서에 있으면 포커스를 한 번 더 돌려준다.
      const el = opener.current;
      if (el instanceof HTMLElement && el.isConnected) el.focus();
      opener.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="sheet m-0 mx-auto mt-auto w-full max-w-column overflow-hidden rounded-t-control rounded-b-none border-0 bg-paper p-0 text-ink backdrop:bg-ink/40 desktop:mx-0 desktop:mr-auto desktop:mb-auto desktop:ml-[calc(50%-100px)] desktop:w-[440px] desktop:rounded-control"
    >
      <div className="flex max-h-[80dvh] flex-col pb-[env(safe-area-inset-bottom)] desktop:max-h-[70dvh] desktop:pb-0">
        <div className="flex items-center justify-between gap-3 pl-gutter pr-2">
          <h2 id={titleId} className="m-0 py-4 font-display text-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-touch shrink-0 rounded-none border-0 bg-transparent px-3 text-body-sm font-medium text-ink"
          >
            닫기
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </dialog>
  );
}
