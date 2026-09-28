---
type: decision
date: 2026-09-27
status: active
owner: pm
decided_by: user
---

# 안양 청년정책 비서 — AI 모델과 데이터 전송 원칙 결정

## Summary

대화·요약은 DeepSeek API, 임베딩은 Google Gemini 임베딩 무료 티어를 쓴다. 두 외부 API에는 식별정보를 보내지 않는다. 예외로 사용자가 대화에서 직접 말한 이름·호칭은 기억해 DeepSeek에 보낼 수 있다(user, 2026-09-29).

## Context

비용을 줄이려고 저가·무료 API를 골랐다. DeepSeek은 국외 서버에서 처리되고, Gemini 무료 티어 입력은 제품 개선에 쓰일 수 있다. 그래서 전송 데이터 범위를 결정과 함께 고정했다. 사용자가 2026-09-27에 확정했다.

## Details

| 항목 | 값 |
|---|---|
| 대화·요약 | DeepSeek API |
| 임베딩 | Google Gemini 임베딩 무료 티어 |
| 데이터 전송 원칙 | DeepSeek·Gemini에는 식별정보(이름·이메일·계정 ID)를 보내지 않는다. 대화에는 나이대·성별·직군 같은 조건만, 임베딩에는 공지 본문·선호 문장·채팅 사용자 메시지만 보낸다. 프로필은 임베딩하지 않는다 |
| 채팅 메시지 임베딩 | 채팅 RAG 검색을 위해 사용자 메시지를 Gemini로 임베딩하는 것을 허용한다. 전송 전에 전화번호·이메일·주민등록번호 형태를 정규식으로 가린다(user, 2026-09-27 — 공지 본문·선호 문장만 보내던 원안을 넓힘) |
| 대화에서 말한 이름·호칭 | 위 원칙의 예외. 사용자가 대화에서 직접 알려준 이름·호칭은 기억(선호 문장)에 담아 저장하고, 기억 추출·채팅 시스템 프롬프트로 DeepSeek에 보내는 것을 허용한다. 계정의 이름·이메일·계정 ID 필드는 계속 보내지 않는다. 전화번호·이메일·주민등록번호 형태는 기억 문장에서도 계속 `maskPii`로 가린다(user, 2026-09-29, [[anyang-youth-policy-assistant]] 확인 항목 43) |
| 나이대 구간 | 청년정책 구간: 19세 미만 / 19~24 / 25~29 / 30~34 / 35~39 / 40세 이상. 만 나이는 Asia/Seoul 기준 현재 연도 − 출생연도로 계산한다. DeepSeek에는 출생연도 원값이 아니라 이 구간 문자열만 보낸다. 경계 처리 세부는 [[anyang-backend-api]] (user, 2026-09-28) |

- "대화할수록 맞춤형"은 사용자별 기억 누적 방식이며 모델 재학습이 아니다(사용자 확인, 2026-09-27). 구체적인 저장·매칭 방식은 [[anyang-backend-api]]에서 정한다.
- 기억은 채팅 시스템 프롬프트에도 넣고, 추출은 AI 답변이 끝날 때마다 한다(user, 2026-09-29). 세부는 [[anyang-backend-api]].
- 참고(pm, 2026-09-29): 선호 문장은 원래 Gemini로 임베딩한다(위 표). 그래서 이름이 담긴 기억 문장도 임베딩 때 Gemini로 간다. 사용자 결정 원문은 "DeepSeek 전송 허용"이라 Gemini 포함 여부는 재승인 때 확인한다(확인 항목 43). 채팅 사용자 메시지 원문은 이미 두 곳 모두로 간다.
- 임베딩 모델명·출력 차원, 무료 티어 한도는 공식 문서로 확인해 [[anyang-backend-api]]와 [[anyang-database-schema]]에 반영했다(2026-09-27).
- ~~동의 화면의 국외 이전 고지에 "Gemini로 대화 내용 전송"을 포함한다~~ → 변경(user, 2026-09-28): 동의 화면·처리방침에는 국가명·서비스명 없이 "AI가 대화 내용을 처리" 수준으로만 표시한다. 실제 전송 범위(위 표)는 그대로다. 법적 고지 요건 확인은 [[anyang-youth-policy-assistant]] 확인 항목 41([[anyang-service-scope]]).

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-stack-database]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-service-scope]]
- [[anyang-preferences-put-missing-mask-pii]]
