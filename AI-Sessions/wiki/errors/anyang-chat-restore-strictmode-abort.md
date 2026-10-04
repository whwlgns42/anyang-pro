---
type: error
date: 2026-10-05
status: draft
owner: code-review
---

# 채팅 복원: StrictMode 이중 실행이 첫 마운트 서버 조회를 취소 (a07eaf5)

## Summary

`web/app/(tabs)/chat/chat-client.tsx:68-78`의 `!id` 분기가 첫 마운트에서 URL로 대체한 복원(`fromUrl`)을 개발 모드에서 취소한다. 코드 추론이며 실행으로 확인하지 못했다.

## Context

prop `initialConversationId`가 null이고 URL에 `?conversation_id=A`가 있는 첫 마운트. 첫 실행은 `fromUrl`로 A 조회를 시작하고(`readyRef=false`) `firstRun=false`로 만든다. React StrictMode(Next 16 App Router 개발 모드 기본)는 effect를 한 번 더 실행하는데 ref는 유지된다. 두 번째 실행은 `fromUrl=null`, prop=null이라 `!id` 분기로 들어가고 `readyRef`가 false이므로 방금 시작한 조회를 `abort()`하고 `restoring=false`로 만든다. 결과는 빈 화면이다. 이전 커밋에서는 이 분기가 단순 `return`이라 문제가 없었다.

## Details

- 영향: 개발 모드 한정(프로덕션은 effect 이중 실행이 없음). 개발·수동 확인에서 "뒤로가기 복원이 안 된다"로 오판하게 만든다.
- 수정 방향: `!id` 분기의 취소·리셋은 `window.location.search`에도 `conversation_id`가 없을 때만 한다.

## Links

- [[anyang-chat-snapshot-scroll-restore-order]]
- [[anyang-frontend-screens]]
