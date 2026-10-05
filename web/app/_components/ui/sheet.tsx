"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

// triggerRef: 시트를 연 버튼. Safari는 버튼 클릭에 포커스를 주지 않아 activeElement가 body라서, 닫을 때 이 요소로 복귀한다.
type SheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  triggerRef?: RefObject<HTMLElement | null>;
};

// 바깥 클릭 판정: 누른 곳과 뗀 곳이 모두 dialog 자체일 때만 닫는다(안쪽에서 누르고 바깥에서 떼면 유지).
export function isBackdropClick(down: EventTarget | null, click: EventTarget | null, dialog: Element | null) {
  return dialog !== null && down === dialog && click === dialog;
}

// 포커스 복귀 대상: 명시한 트리거 > 열 때의 activeElement. 문서에서 빠진 요소는 제외한다.
export function pickReturnTarget(trigger: Element | null | undefined, opener: Element | null) {
  for (const el of [trigger, opener]) {
    if (el && el.isConnected && el.tagName !== "BODY" && "focus" in el) return el as HTMLElement;
  }
  return null;
}

// 바텀시트(1200px 이상은 사이드바 옆 가운데 모달). 네이티브 <dialog>라 showModal()이 뒷배경을 비활성으로
// 만들고 Tab을 안에 가둔다. Esc는 상태를 한 곳(onClose)에서만 바꾸려고 가로챈다.
// dialog 자체에는 패딩을 두지 않는다(바깥 클릭 판정: e.target === dialog). 열 때 움직임은 globals.css의 .sheet.
export function Sheet({ open, title, onClose, children, triggerRef }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);
  const downTarget = useRef<EventTarget | null>(null);

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
      pickReturnTarget(triggerRef?.current, opener.current)?.focus();
      opener.current = null;
    }
  }, [open, triggerRef]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        downTarget.current = e.target;
      }}
      onClick={(e) => {
        if (isBackdropClick(downTarget.current, e.target, ref.current)) onClose();
        downTarget.current = null;
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
