import type { KeyboardEvent, ReactNode } from "react";
import Link from "next/link";
import { CHAT_MAX_LENGTH, counterView } from "../../_lib/chat-error";
import { shouldSubmitOnKey } from "../../_lib/composer-key";
import { formatDate } from "../../_lib/format";
import { Icon } from "./icon";

// 내 질문 말풍선.
export function MessageBubble({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto max-w-[78%] rounded-bubble rounded-br-bubble-tail bg-accent px-4 py-3 text-body whitespace-pre-wrap text-on-accent">
      {children}
    </div>
  );
}

export type SourceItem = { id: string; title: string; postedAt: string | null };

// 근거 공지 카드. AI 답변 위에 둔다. 0건이면 아무것도 그리지 않는다(검색 중 상태 제외).
export function SourceList({ items, searching = false }: { items: SourceItem[]; searching?: boolean }) {
  if (searching) {
    return (
      <div className="rounded-card border border-rule bg-surface px-3.5 py-2.5 text-label text-ink-2">
        관련 공지를 찾고 있어요
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <div className="rounded-card border border-rule bg-surface">
      <div className="border-b border-rule px-3.5 py-2.5 text-label text-ink-2">참고한 공지 {items.length}건</div>
      <ol className="m-0 list-none p-0">
        {items.map((item, i) => {
          const day = formatDate(item.postedAt);
          return (
            <li key={item.id} className="border-b border-rule last:border-b-0">
              <Link
                href={`/notices/${item.id}`}
                className="grid grid-cols-[16px_minmax(0,1fr)_16px] items-start gap-x-2.5 py-3 pr-3 pl-3.5 text-ink no-underline"
              >
                <span className="font-mono text-label font-medium text-accent">{i + 1}</span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="line-clamp-2 text-body-sm font-medium">{item.title}</span>
                  {day && (
                    <time dateTime={item.postedAt ?? undefined} className="font-mono text-meta text-ink-3">
                      {day}
                    </time>
                  )}
                </span>
                <Icon name="chevron-right" size={16} className="mt-0.5 text-ink-3" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export type AnswerState = "searching" | "streaming" | "done" | "error";

type AnswerBlockProps = {
  /** AI에 실제로 보낸 조건만 적는다. 예: 25~29세 · 구직·미취업 기준. 없으면 줄을 숨긴다 */
  context: string | null;
  sources: SourceItem[];
  state?: AnswerState;
  onRetry?: () => void;
  /** error 상태 문구. 기본은 답변이 중간에 끊긴 경우 */
  errorText?: string;
  children?: ReactNode;
};

// AI 답변. 근거 공지 카드가 먼저, 답변 글이 그 아래. 답변 글은 테두리 없이 배경 위에 써서
// 공식 공지(카드)와 구분한다. error 상태는 prop으로 받는다.
export function AnswerBlock({ context, sources, state = "done", onRetry, errorText = "답변을 끝까지 받지 못했어요", children }: AnswerBlockProps) {
  return (
    <section aria-label="청안의 답변" aria-busy={state === "searching" || state === "streaming"} className="flex flex-col gap-3.5">
      <div className="flex items-baseline gap-2">
        <span className="text-label font-semibold text-accent">청안</span>
        {context && <span className="font-mono text-meta text-ink-3">{context}</span>}
      </div>
      <SourceList items={sources} searching={state === "searching"} />
      {children && <div className="text-body whitespace-pre-wrap">{children}</div>}
      {state === "error" && (
        <div className="flex items-center justify-between gap-3 border-t border-rule pt-2">
          <span className="text-body-sm text-ink-2">{errorText}</span>
          <button
            type="button"
            onClick={onRetry}
            className="h-touch rounded-none border-0 bg-transparent px-2 text-body-sm font-medium text-accent"
          >
            다시 시도
          </button>
        </div>
      )}
    </section>
  );
}

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
};

// 질문 입력줄. 비어 있거나 답변을 받는 중이면 보내기를 막는다. Enter 전송, Shift+Enter 줄바꿈.
export function Composer({ value, onChange, onSubmit, busy }: ComposerProps) {
  const canSend = value.trim().length > 0 && !busy;
  const counter = counterView(value.length);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (shouldSubmitOnKey(e)) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      className="flex shrink-0 flex-wrap items-end gap-2 border-t border-rule px-4 py-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {counter && (
        <p id="chat-input-count" className={`m-0 w-full text-right text-meta ${counter.atLimit ? "text-danger" : "text-ink-3"}`}>
          {counter.text}
          {counter.atLimit && <span role="status"> 더 입력할 수 없어요</span>}
        </p>
      )}
      <label htmlFor="chat-input" className="sr-only">
        메시지 입력
      </label>
      <textarea
        id="chat-input"
        rows={1}
        maxLength={CHAT_MAX_LENGTH}
        aria-describedby={counter ? "chat-input-count" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="궁금한 정책을 물어보세요"
        className="h-control max-h-32 min-w-0 flex-1 resize-none rounded-control border border-field bg-surface px-4 py-[11px] text-body text-ink placeholder:text-ink-3"
      />
      <button
        type="submit"
        aria-label="보내기"
        disabled={!canSend}
        className="flex size-control shrink-0 items-center justify-center rounded-pill border-0 bg-accent p-0 text-on-accent transition-colors duration-150 disabled:bg-disabled disabled:text-ink-3 disabled:opacity-100"
      >
        <Icon name="send" strokeWidth={2} />
      </button>
    </form>
  );
}
