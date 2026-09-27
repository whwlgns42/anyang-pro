---
type: project
date: 2026-09-27
status: active
owner: pm
---

# 안양 청년정책 AI 리서치 비서

## Summary

안양시 청년정책 공지 중 사용자 프로필·대화 이력에 맞는 것만 골라 주고, 사용자가 정한 시각에 새 공지를 Web Push로 알리는 PWA 웹앱이다. 현재 단계: 설계(수정 완료, 사용자 승인 대기).

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
| 서비스 범위 | 수집 대상 게시판 1개, 프로필 4항목, 사용자별 알림 시각·on/off, 기억·히스토리 화면, 인증 부가 테이블 미사용, 가입 시 개인정보 동의·처리방침, 관리자 페이지(`ADMIN_EMAILS`, 기능 4종, 대화·기억 원문 비노출) | [[anyang-service-scope]] |
| 이전 가능성 원칙 | Vercel+Supabase ↔ UNO Q 양방향 전환, Docker 미사용 | [[anyang-deployment-portability#이전 가능성 원칙 (Vercel+Supabase ↔ UNO Q)]] |

### 진행 상태

- 2026-09-27: 결정 문서 4종, glossary 도메인 용어 추가. 설계 단계 완료(database → backend → frontend). 사용자 설계 승인 대기.
- 2026-09-27: git init 사용자 승인. git-manager가 저장소 생성과 초기 커밋(기존 vault + 설계 단계 문서).
- 2026-09-27: pm 세션 비정상 종료 후 재개. 설계 문서 역링크 보완(database·backend), 인수인계 [[2026-09-27_anyang-design-approval-wait]] 작성.
- 2026-09-27: 사용자 답변(확인 항목 1·2·3·5·6·10·11·12)을 [[anyang-service-scope]]로 확정, 원칙 5(도메인 나중) 변경. 설계 수정 라운드(database → backend → frontend) 완료, 설계 문서 5종 draft로 재승인 대기. 새 질문 14~19.
- 2026-09-27: 사용자 새 요청 — 관리자 페이지 추가([[anyang-service-scope]]). 설계 수정 라운드(database → backend → frontend) 완료. 새 질문 20·21.

### 설계 문서 (status: draft, 사용자 승인 대기)

- [[anyang-database-schema]] — database. 스키마, HNSW 인덱스, pg_cron+pg_net 잡, 재임베딩 절차
- [[anyang-backend-api]] — backend. API 계약, 인증, 채팅 RAG, 임베딩, 수집기, Web Push, 환경변수, 배포, UNO Q 전환 runbook
- [[anyang-frontend-screens]] — frontend. 화면 설계, PWA manifest·서비스워커
- [[anyang-backend-tasks]] — backend 구현 작업 단위(dev-task, draft)
- [[anyang-frontend-tasks]] — frontend 구현 작업 단위(dev-task, draft)

## 확인이 필요한 항목

1. 수집 대상 — 해결(2026-09-27, user): 안양시 청년 게시판 1개. [[anyang-service-scope]]
2. 프로필 항목 — 해결(2026-09-27, user): 생년·성별·직군·재학/재직 여부만. [[anyang-service-scope]]
3. 알림 시각 — 해결(2026-09-27, user): 사용자별 자유 설정 + on/off. [[anyang-service-scope]]
4. git init 승인 — 승인됨(2026-09-27, user). 초기 커밋 `0b7166d`.
5. 수익화 계획 — 해결(2026-09-27, user): 없음, Vercel Hobby 유지. [[anyang-deployment-portability]]
6. 개인정보 처리방침·동의 화면 — 해결(2026-09-27, user): 가입 시 필수 동의 화면(국외 이전 고지, 동의 시각 기록) + 처리방침 페이지. 세부 문구·기록 방식은 설계 제안값(미확정). [[anyang-service-scope]]
7. 커스텀 도메인 — 미해결(배포 시점에 결정, user 2026-09-27). 설계는 나중에 붙는다는 전제로 base URL을 환경변수로 받는다. [[anyang-deployment-portability]]
8. 공식 수치 4건 — 해결(2026-09-27, 메인 세션 웹 확인). 수치와 출처는 [[anyang-backend-api]]에 반영.
9. 공지 자격요건을 `notices`의 구조화 컬럼으로 둘지 — 게시판 확정(항목 1)에 따라 재검토 대상. 설계 수정 결과를 보고 사용자 확인.
10. "AI가 기억하는 내 정보" 화면 — 해결(2026-09-27, user): 넣는다, 조회·수정·삭제. [[anyang-service-scope]]
11. 대화 히스토리 목록 화면 — 해결(2026-09-27, user): 넣는다. [[anyang-service-scope]]
12. 인증 부가 테이블 — 해결(2026-09-27, user): 쓰지 않는다. [[anyang-service-scope]]
13. UNO Q 전환 시 HTTPS 확보 방법(리버스 프록시/터널) — 현재 UNO Q 미사용이라 설계 범위 밖, 전환 시 별도 조사.
14. 회원 탈퇴 시 동의 기록(`consents`) 삭제 vs 법적 보존 — 현재 설계는 on delete cascade(잠정). database 제기 2026-09-27. [[anyang-database-schema]]
15. 동의 항목을 단일 체크로 받을지, 수집·이용 / 국외 이전으로 분리할지. database 제기 2026-09-27.
16. 비밀번호 재설정 기능을 이번 범위에 넣을지(계획서에 없던 항목). 넣으면 이메일 발송 수단도 정해야 한다. 이메일 인증은 backend가 범위 제외로 제안. backend 제기 2026-09-27. [[anyang-backend-api]]
17. 알림 잡 중복 발송 방지 방식 — database 제안(2026-09-27): `notify_logs`의 `unique(user_id, notice_id)`. 설계 승인으로 확정. [[anyang-database-schema]]
18. 처리방침 개정 시 재동의 강제 여부(`consents.policy_version`) — backend는 이번엔 만들지 않기로 제안. backend 제기 2026-09-27.
19. 프로필 코드값 셋(`gender`·`occupation_type`·`enrollment_status` 선택지) — database 설계 승인 때 함께 확정. frontend 제기 2026-09-27. [[anyang-database-schema]]
20. 로그성 테이블(`collect_runs`·`notify_logs`·`api_usage_logs`) 보존 기간(제안 90일)과 정리 잡(pg_cron, 데이터 삭제라 되돌릴 수 없음) 등록 여부. `notify_logs`를 지우면 오래된 공지가 재발송될 수 있어 항목 17과 함께 판단. database 제기 2026-09-27. [[anyang-database-schema]]
21. `notify_logs.result`에 `pending`(발송 전) 값을 둘지 — 사용자 결정보다 database·backend 설계 조율 항목. 현재 제안은 `success`/`failed`만. backend 제기 2026-09-27. [[anyang-backend-api]]

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
- [[anyang-service-scope]]
- [[2026-09-27_anyang-design-approval-wait]]
