---
type: error
date: 2026-10-04
status: active
owner: code-review
---

# 안양 비서 60 — 채팅 스크롤 복원이 첫 마운트에서 소모되는 효과 순서 버그

## Summary

`chat-client.tsx`에서 복원 `useLayoutEffect`가 `pendingScroll`을 채운 같은 커밋에서, 뒤에 선언된 스크롤 `useLayoutEffect`가 그 값을 비어 있는 목록에 먼저 써 버린다. 그래서 보관분(sessionStorage) 경로의 스크롤 위치 복원이 동작하지 않고 항상 맨 아래로 간다. 코드 읽기 기준 판단이며 실행으로는 확인하지 못했다.

## Context

커밋 31618df, 확인 항목 60 구현. 설계 [[anyang-frontend-screens]] 3-1절 8번(보관한 `scrollTop`으로 복원, 인용 카드 뒤 반복 열람).

## Details

- 마운트 커밋의 효과 실행 순서는 선언 순서다: ① 복원 효과가 `pendingScroll.current = {...}`와 `setMessages(snap.messages)`를 호출, ② 같은 커밋의 스크롤 효과(`[messages.length, sending]`)가 `pendingScroll`을 꺼내(`null`로 비움) 빈 목록 위에서 `scrollTo`한다.
- `setMessages`로 다시 그려진 뒤 스크롤 효과가 `messages.length` 변화로 다시 돌지만 `pendingScroll`은 이미 `null`이라 `scrollHeight`(맨 아래)로 간다.
- 서버 조회 경로(`.then` 안에서 `pendingScroll` 설정)는 비동기라 순서 문제가 없다. 영향은 스트리밍이 아닌 보관분을 동기로 채우는 주 경로다.
- 단위 테스트는 순수 함수만 다뤄 이 순서를 잡지 못한다.
- 다음에는: 스크롤 효과가 `messages.length === 0`이면 `pendingScroll`을 소모하지 않게 하거나, 복원 값을 적용한 뒤에만 비운다. 수동 시나리오 (가)에서 중간 스크롤 위치 복원을 확인한다.

## Links

- [[anyang-frontend-screens]]
- [[anyang-frontend-tasks]]
