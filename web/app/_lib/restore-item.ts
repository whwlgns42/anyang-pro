// 5초 되돌리기용 순수 함수. 목록 화면의 낙관적 제거를 되살리거나, 제거 뒤 포커스 자리를 정한다.

/** 원래 자리(index)에 되살린다. 이미 있으면 그대로, 자리가 길이를 넘으면 맨 뒤. */
export function insertBack<T extends { id: string }>(list: T[], { item, index }: { item: T; index: number }): T[] {
  if (list.some((it) => it.id === item.id)) return list;
  const next = [...list];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
  return next;
}

/** 제거 뒤 새 목록 기준으로 포커스를 줄 행 인덱스. 목록이 비면 -1. */
export function focusIndexAfterRemove(newLength: number, removedIndex: number): number {
  if (newLength <= 0) return -1;
  return Math.min(removedIndex, newLength - 1);
}
