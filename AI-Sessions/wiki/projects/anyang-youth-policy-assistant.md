---
type: project
date: 2026-09-27
status: active
owner: pm
---

# 안양 청년정책 AI 리서치 비서

## Summary

안양시 청년정책 공지 중 사용자 프로필·대화 이력에 맞는 것만 골라 주고, 사용자가 정한 시각에 새 공지를 Web Push로 알리는 PWA 웹앱이다. 현재 단계: 설계.

## Context

안양시 청년정책 공지는 양이 많고 흩어져 있어 청년 각자가 자기 나이·성별·직군에 맞는 정보를 찾기 어렵다. 사용자가 2026-09-27에 전체 계획을 승인했다. 계획서의 "전체 아키텍처" 이하 세부는 제안이며 각 설계 문서에서 정한다.

## Details

### 확정 값 (사용자, 2026-09-27)

| 항목 | 값 | 출처 |
|---|---|---|
| 스택 | Next.js(App Router) 풀스택, PWA 웹앱 | [[anyang-stack-database]] |
| DB | PostgreSQL + pgvector | [[anyang-stack-database]] |
| AI | 대화·요약: DeepSeek API / 임베딩: Google Gemini 임베딩 무료 티어 | [[anyang-ai-models-data-transfer]] |
| 데이터 전송 원칙 | 외부 AI에 식별정보(이름·이메일·계정 ID) 전송 금지. 대화에는 조건만, 임베딩에는 공지 본문·선호 문장만 | [[anyang-ai-models-data-transfer]] |
| 로그인 | Google 소셜 로그인 + 자체 회원가입(이메일·비밀번호) | [[anyang-login-method]] |
| 배포 | Vercel Hobby(`icn1`) + Supabase 무료(서울, pgvector). UNO Q 미사용 | [[anyang-deployment-portability]] |
| 스케줄 | 알림 잡은 Supabase `pg_cron` + `pg_net`이 몇 분마다 앱 API 호출 | [[anyang-deployment-portability]] |
| 이용 조건 | Hobby는 비상업 전용. 수익화하면 Pro 전환 | [[anyang-deployment-portability]] |
| 이전 가능성 원칙 | Vercel+Supabase ↔ UNO Q 양방향 전환, Docker 미사용 | [[anyang-deployment-portability#이전 가능성 원칙 (Vercel+Supabase ↔ UNO Q)]] |

### 진행 상태

- 2026-09-27: 결정 문서 4종, glossary 도메인 용어 추가. 설계 단계 완료(database → backend → frontend). 사용자 설계 승인 대기.
- 2026-09-27: git init 사용자 승인. git-manager가 저장소 생성과 초기 커밋(기존 vault + 설계 단계 문서).
- 2026-09-27: pm 세션 비정상 종료 후 재개. 설계 문서 역링크 보완(database·backend), 인수인계 [[2026-09-27_anyang-design-approval-wait]] 작성.

### 설계 문서 (status: draft, 사용자 승인 대기)

- [[anyang-database-schema]] — database. 스키마, HNSW 인덱스, pg_cron+pg_net 잡, 재임베딩 절차
- [[anyang-backend-api]] — backend. API 계약, 인증, 채팅 RAG, 임베딩, 수집기, Web Push, 환경변수, 배포, UNO Q 전환 runbook
- [[anyang-frontend-screens]] — frontend. 화면 설계, PWA manifest·서비스워커
- [[anyang-backend-tasks]] — backend 구현 작업 단위(dev-task, draft)
- [[anyang-frontend-tasks]] — frontend 구현 작업 단위(dev-task, draft)

## 확인이 필요한 항목

1. 수집 대상 — 안양시 어느 게시판(시청 공지, 청년 포털 등)? URL은 사용자가 제공.
2. 프로필 항목 — 나이·성별·직군 외 필요한 것(재학/재직 여부, 소득 구간 등)? 개인정보 최소화 범위.
3. 알림 시각 — 사용자별 자유 설정인지, 고정 선택지인지.
4. git init 승인 — 승인됨(2026-09-27, user). 초기 커밋은 git-manager가 수행.
5. 수익화 계획 유무(Vercel Hobby 비상업 조건).
6. 개인정보 처리방침·동의 화면 필요 여부(생년·성별 수집, DeepSeek 국외 처리 고지 포함).
7. 커스텀 도메인 구입 여부와 도메인 이름.
8. 공식 수치 미확인 4건(backend 세션에 웹 접근 도구 없음) — Gemini 임베딩 무료 티어 요청 한도, DeepSeek API 요청 한도, Vercel Hobby 함수 실행 시간 한도, `gemini-embedding-001`·`output_dimensionality=768` 지원 여부. 구현 전 웹 접근 가능한 세션에서 재확인. 차원이 달라지면 [[anyang-database-schema]]의 벡터 차원도 바뀐다.
9. 공지 자격요건을 `notices`의 구조화 컬럼으로 둘지(현재 설계는 프롬프트 컨텍스트로만 반영) — 항목 1의 게시판 확정 후 재검토.
10. "AI가 기억하는 내 정보" 화면(`/settings/memory`) 채택 여부, 채택 시 "수정" 기능 필요 여부(현재 backend 계약은 조회·삭제만).
11. 채팅 대화 히스토리 목록 화면 포함 여부.
12. 인증 부가 테이블(Auth.js `verification_tokens` 등, 이메일 인증·비밀번호 재설정용) 필요 여부 — backend·database 재조율.
13. UNO Q 전환 시 HTTPS 확보 방법(리버스 프록시/터널) — 현재 UNO Q 미사용이라 설계 범위 밖, 전환 시 별도 조사.

## 승인된 설계

(아직 없음)

## Jev 도입 제안

(아직 없음) — 2026-09-27 backend 검토: "공지-사용자 관련성" 매칭은 설계상 코사인 유사도 임계값(결정적 계산)이라 LLM 판단이 없어 해당 없음.

## Links

- [[anyang-stack-database]]
- [[anyang-ai-models-data-transfer]]
- [[anyang-login-method]]
- [[anyang-deployment-portability]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-backend-tasks]]
- [[anyang-frontend-tasks]]
- [[glossary]]
- [[2026-09-27_anyang-design-approval-wait]]
