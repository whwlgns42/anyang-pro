// 되돌리기 가능한 삭제: 삭제 요청을 delayMs(5초) 늦춘다. 한 번에 하나만 대기한다.
// - undo(): 요청을 보내지 않고 대기 항목을 돌려준다.
// - 다른 항목을 지우면 앞 항목은 즉시 보낸다. 화면을 떠나거나 탭을 숨길 때는 flush(true)로
//   keepalive 요청을 즉시 보낸다(사용자가 지웠다고 생각한 개인정보가 남지 않게).
// - 요청이 실패하면 onFail(item)을 부른다(항목 되살림은 호출한 쪽 몫).
export type DelayedDelete<T> = {
  schedule(item: T): void;
  undo(): T | null;
  flush(keepalive?: boolean): void;
};

type Options<T> = {
  send: (item: T, keepalive: boolean) => Promise<void>;
  onFail: (item: T) => void;
  delayMs?: number;
};

export function createDelayedDelete<T>({ send, onFail, delayMs = 5000 }: Options<T>): DelayedDelete<T> {
  let pending: { item: T; timer: ReturnType<typeof setTimeout> } | null = null;

  function fire(item: T, keepalive: boolean) {
    send(item, keepalive).catch(() => onFail(item));
  }

  function flush(keepalive = false) {
    if (!pending) return;
    const { item, timer } = pending;
    clearTimeout(timer);
    pending = null;
    fire(item, keepalive);
  }

  return {
    schedule(item) {
      flush();
      const timer = setTimeout(() => {
        pending = null;
        fire(item, false);
      }, delayMs);
      pending = { item, timer };
    },
    undo() {
      if (!pending) return null;
      clearTimeout(pending.timer);
      const { item } = pending;
      pending = null;
      return item;
    },
    flush,
  };
}
