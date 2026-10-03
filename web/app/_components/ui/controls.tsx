"use client";

import { useCallback, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonSize = "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "border-0 bg-accent text-on-accent active:bg-accent-press disabled:bg-disabled disabled:text-ink-3",
  secondary: "border border-field bg-surface text-ink font-medium",
  danger: "border-0 bg-danger text-on-accent",
};

// <a>/<Link>에도 같은 모양을 입히려고 클래스만 따로 내보낸다.
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return [
    "inline-flex items-center justify-center gap-2 rounded-control px-5 text-title no-underline",
    size === "lg" ? "h-button-lg" : "h-control",
    variantClass[variant],
  ].join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...rest} />;
}

type SwitchProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  labelledBy: string;
  /** 비활성일 때 이유 문구의 id */
  describedBy?: string;
};

// 켜기/끄기. 트랙 52x32, 누르는 영역 64x44.
export function Switch({ checked, onChange, disabled = false, labelledBy, describedBy }: SwitchProps) {
  const track = disabled ? "bg-rule" : checked ? "bg-accent" : "bg-switch-off";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="flex h-touch w-16 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-100"
    >
      <span className={`flex h-8 w-13 rounded-pill p-[3px] transition-colors duration-150 ease-out ${track}`}>
        <span
          className={`block size-[26px] rounded-pill transition-transform duration-150 ease-out motion-reduce:transition-none ${
            disabled ? "bg-surface" : "bg-on-accent"
          } ${checked ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}

// 설정 묶음: 면 + 테두리 + 행 사이 구분선.
export function SettingsGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-rule rounded-control border border-rule bg-surface">{children}</div>;
}

type ToastProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
};

// 화면 아래 잠깐 뜨는 알림. 키보드 포커스가 안에 있는 동안은 사라지지 않는다.
// fixed: 모바일·태블릿은 하단 탭 바 위, 데스크톱은 사이드바(240px)를 뺀 열 아래에 뜬다.
export function Toast({ message, actionLabel, onAction, onDismiss, duration = 5000 }: ToastProps) {
  const timer = useRef<number | undefined>(undefined);
  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(onDismiss, duration);
  }, [onDismiss, duration]);

  useEffect(() => {
    start();
    return () => window.clearTimeout(timer.current);
  }, [start]);

  return (
    <div
      role="status"
      onFocus={() => window.clearTimeout(timer.current)}
      onBlur={start}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] left-1/2 flex w-[min(calc(100%-40px),calc(var(--container-column)-40px))] -translate-x-1/2 items-center gap-3 rounded-control bg-ink py-1 pr-1 pl-4 text-body-sm text-on-accent desktop:bottom-6 desktop:left-[calc(50%+120px)]"
    >
      <span className="flex-1">{message}</span>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="h-touch rounded-none border-0 bg-transparent px-3 text-body-sm font-semibold text-on-accent"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// 확인 다이얼로그(<dialog>). 위험한 동작(탈퇴)용이라 확인 버튼은 danger.
export function ConfirmDialog({ open, title, description, confirmLabel, busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(340px,calc(100%-40px))] rounded-control border-0 bg-paper p-6 text-ink backdrop:bg-ink/40"
    >
      <h2 id={titleId} className="font-display text-heading">
        {title}
      </h2>
      <p className="mt-2 text-body-sm text-ink-2">{description}</p>
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
          취소
        </Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
