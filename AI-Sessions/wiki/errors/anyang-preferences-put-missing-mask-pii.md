---
type: error
date: 2026-09-28
status: superseded
owner: code-review
---

# 안양 비서 — `PUT /api/preferences/:id`가 가림 함수 없이 Gemini에 원문 전송

## Summary

`web/app/api/preferences/[id]/route.ts`의 `PUT` 핸들러가 사용자가 입력한
`preference_text`를 [[anyang-ai-models-data-transfer]]가 요구하는 `maskPii()` 없이
그대로 `embedText()`(Gemini 임베딩 API)에 전달한다. 채팅 흐름(`web/app/api/chat/route.ts`)은
사용자 메시지·선호 요약 모두 Gemini/DeepSeek 전송 전 `maskPii()`를 거치지만, "AI가 기억하는
내 정보" 수정 API만 이 처리가 빠져 있다.

## Context

- 설계: [[anyang-backend-api#3. 채팅 — DeepSeek 스트리밍 + RAG]] 0번 — "가림 함수는 한 곳에
  두고 Gemini·DeepSeek 전송 직전 두 지점 모두 이 함수를 호출한다"(외부 전송 텍스트 전체에
  적용하는 원칙). [[anyang-ai-models-data-transfer]] — 외부 AI에 식별정보 전송 금지.
- pm 지시서 검수 범위: 커밋 `83fad79` 이후 backend 구현. 문제 코드는 `83fad79`에서 도입됨.

## Details

- 파일: `web/app/api/preferences/[id]/route.ts:31` — `embedding = await embedText(preferenceText);`
  `preferenceText`는 요청 body를 그대로 받은 값(9~18행)이며 `maskPii()` 호출이 없다.
- 사용자가 "AI가 기억하는 내 정보" 화면에서 전화번호·이메일·주민등록번호 형태가 포함된
  문장으로 직접 수정하면, 그 원문이 그대로 Gemini `embedContent` API로 전송된다.
- 비교: `web/app/api/chat/route.ts:56` (`const maskedSummary = maskPii(summary);` 후
  `embedText(maskedSummary)`)와 `web/app/api/chat/route.ts:150`
  (`const maskedMessage = maskPii(message); ... embedText(maskedMessage)`)는 모두 가림 처리를
  거친다.
- `web/test/preferences.test.ts`에도 가림 처리 검증이 없어 회귀 테스트로 걸러지지 않는다.

## 재위임 (해결됨)

- 표시: **구현 수정**(설계 원칙은 이미 "가림 함수는 한 곳에 두고 두 지점 모두 호출"로 명확함,
  세 번째 지점을 놓친 구현 누락)
- 담당: backend
- 파일:줄: `web/app/api/preferences/[id]/route.ts:31`

## 해결 기록 (2026-09-28, 재검수 1차)

커밋 `622962b`에서 두 겹으로 수정됨.

- `web/lib/embeddings.ts:69` — `embedText()` 내부에서 `maskPii()`를 강제 적용해, 호출부가
  가림 처리를 빠뜨려도 Gemini에 원문이 나가지 않게 함. 이미 가려진 텍스트를 다시 넣어도
  `maskPii`의 정규식은 `[전화번호]`/`[이메일]`/`[주민등록번호]` 같은 대체 문자열에 다시
  매칭하지 않으므로 멱등 — 재확인 완료(`web/lib/mask-pii.ts`의 정규식이 `@`·숫자 패턴만
  잡고 대괄호 표기에는 매칭하지 않음).
- `web/app/api/preferences/[id]/route.ts:29-35` — `preferenceText`를 `maskPii()`로 가린 뒤
  `embedText()`에도, DB `update`(`preference_text` 컬럼)에도 가려진 값을 씀.
- DB 저장 값을 가림 처리된 문장으로 바꾼 것은 설계와 모순이 아님을 확인:
  [[anyang-backend-api#3. 채팅 — DeepSeek 스트리밍 + RAG]] 5번(선호 추출)이 이미 "결과
  문장에도 0번의 가림 함수를 적용한 뒤 ... `user_preferences`에 저장"이라고 명시해,
  `user_preferences.preference_text`는 애초에 가려진 문장을 저장하는 것이 설계 원칙이다
  (반대로 `messages` 테이블은 3절 1번에 따라 원문 저장 — 두 테이블의 저장 규칙이 다른 것은
  의도된 구분이며 이번 수정과 무관).
- DeepSeek 전송 경로 확인: `user_preferences.preference_text`/`embedding`은 `web/app/api/chat/route.ts`에서
  Gemini 임베딩 벡터로만 RAG 쿼리에 쓰이고(22행, 결합 벡터), DeepSeek에는 텍스트 원문이 아니라
  프로필 조건·공지 본문·대화 맥락만 전달된다(192행 이하) — preferences 관련 별도의 DeepSeek
  누락 경로 없음.
- 검증: `web/test/preferences.test.ts`에 마스킹 검증 테스트 추가(전화번호·이메일·주민번호
  세 패턴이 `embedText` 호출 인자와 DB `update` 인자 양쪽에서 사라졌는지 확인). `npm test`
  103/103 통과, `npm run build` 성공(2026-09-28 재검수 1차 실행 확인).
- 결론: 원 지적 사항 해결. 새 차단 항목 없음.

## Links

- [[anyang-backend-api]]
- [[anyang-ai-models-data-transfer]]
- [[anyang-youth-policy-assistant]]
