---
type: decision
date: 2026-09-27
status: active
owner: pm
decided_by: user
---

# 안양 청년정책 비서 — AI 모델과 데이터 전송 원칙 결정

## Summary

대화·요약은 DeepSeek API, 임베딩은 Google Gemini 임베딩 무료 티어를 쓴다. 두 외부 API에는 식별정보를 보내지 않는다.

## Context

비용을 줄이려고 저가·무료 API를 골랐다. DeepSeek은 중국 서버에서 처리되고, Gemini 무료 티어 입력은 제품 개선에 쓰일 수 있다. 그래서 전송 데이터 범위를 결정과 함께 고정했다. 사용자가 2026-09-27에 확정했다.

## Details

| 항목 | 값 |
|---|---|
| 대화·요약 | DeepSeek API |
| 임베딩 | Google Gemini 임베딩 무료 티어 |
| 데이터 전송 원칙 | DeepSeek·Gemini에는 식별정보(이름·이메일·계정 ID)를 보내지 않는다. 대화에는 나이대·성별·직군 같은 조건만, 임베딩에는 공지 본문·선호 문장·채팅 사용자 메시지만 보낸다. 프로필은 임베딩하지 않는다 |
| 채팅 메시지 임베딩 | 채팅 RAG 검색을 위해 사용자 메시지를 Gemini로 임베딩하는 것을 허용한다. 전송 전에 전화번호·이메일·주민등록번호 형태를 정규식으로 가린다(user, 2026-09-27 — 공지 본문·선호 문장만 보내던 원안을 넓힘) |

- "대화할수록 맞춤형"은 사용자별 기억 누적 방식이며 모델 재학습이 아니다(사용자 확인, 2026-09-27). 구체적인 저장·매칭 방식은 [[anyang-backend-api]]에서 정한다.
- 임베딩 모델명·출력 차원, 무료 티어 한도는 공식 문서로 확인해 [[anyang-backend-api]]와 [[anyang-database-schema]]에 반영했다(2026-09-27).
- 동의 화면의 국외 이전 고지에 "Gemini로 대화 내용 전송"을 포함한다([[anyang-service-scope]]).

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-stack-database]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-service-scope]]
- [[anyang-backend-tasks]]
