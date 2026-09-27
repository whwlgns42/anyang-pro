---
type: project
date: 2026-09-27
status: active
owner: pm
---

# 안양 청년정책 AI 리서치 비서

## Summary

안양시 청년정책 공지 중 사용자 프로필·대화 이력에 맞는 것만 골라 주고, 사용자가 정한 시각에 새 공지를 Web Push로 알리는 PWA 웹앱이다. 현재 단계: 1차 구현·검수 완료(2026-09-28). 설계 변경 2건(22·23) 재승인 대기, 외부 자원 준비 후 실제 환경 확인 필요.

## Context

안양시 청년정책 공지는 양이 많고 흩어져 있어 청년 각자가 자기 나이·성별·직군에 맞는 정보를 찾기 어렵다. 사용자가 2026-09-27에 전체 계획을 승인했다. 계획서의 "전체 아키텍처" 이하 세부는 제안이며 각 설계 문서에서 정한다.

## Details

### 확정 값 (사용자, 2026-09-27)

| 항목 | 값 | 출처 |
|---|---|---|
| 스택 | Next.js(App Router) 풀스택, PWA 웹앱 | [[anyang-stack-database]] |
| DB | PostgreSQL + pgvector | [[anyang-stack-database]] |
| AI | 대화·요약: DeepSeek API / 임베딩: Google Gemini 임베딩 무료 티어 | [[anyang-ai-models-data-transfer]] |
| 데이터 전송 원칙 | 외부 AI에 식별정보(이름·이메일·계정 ID) 전송 금지. 대화에는 조건만, 임베딩에는 공지 본문·선호 문장·채팅 메시지(정규식 가림 후)만. 프로필은 임베딩하지 않음 | [[anyang-ai-models-data-transfer]] |
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
- 2026-09-27: 사용자가 남은 항목(9·14·15·16·18·19·20·21)에 권장안으로 답함. [[anyang-service-scope]] 갱신, 설계 수정 라운드(database → backend → frontend) 완료. 이어서 14(1년 보관)·19(코드 식별자) 사용자 확정, database·frontend 반영. 설계 결정용 미해결 항목 없음(7·13은 배포·전환 시점). 설계 문서 5종 재승인 대기.
- 2026-09-27: 승인 전 재점검(메인 세션) 반영. 사용자 결정: 채팅 메시지 Gemini 임베딩 허용(정규식 가림) — [[anyang-ai-models-data-transfer]]. 설계 수정(database → backend → frontend): 탈퇴 예외 경로, 관리자 판정은 Google 로그인 계정만, 403 에러 코드, 알림 쿼리 5분 창·자정 경계, 알림 켠 시각 이후 공지만, 프로필 비임베딩, 수집 잡 하루 1회, 옛 문구 정리.
- 2026-09-27: 2차 재점검(메인 세션) 반영. 관리자 판정은 이번 세션의 로그인 방식(JWT provider=google) 기준, ADMIN_EMAILS 이메일의 이메일 가입 거부, 이메일 계정 연결 정책(자동 연결 off + 안내, 제안), enabled_at 생성 시 채움·null이면 발송 제외, 정지 사용자는 로그인 허용·제한 상태, 스케줄러 헤더 `x-scheduler-secret` 통일, 개인정보 가림을 DeepSeek·선호 문장 전송에도 적용.
- 2026-09-27: 사용자 설계 승인(5종, 기준 커밋 `ef51d3c`). 구현 단계 시작(database → backend → frontend → code-review). 외부 자원(개발용 Supabase `DATABASE_URL`, Google OAuth 클라이언트, DeepSeek·Gemini API 키, VAPID 키, `ADMIN_EMAILS`)은 사용자 준비 필요.
- 2026-09-27: database 구현 완료(`df067cd`, 앱 위치 `web/` pm 결정). backend 1차 시작 직후 사용자 지시로 작업 전체 중단(산출물 없음). frontend·code-review 미착수. 인수인계 [[2026-09-27_anyang-implementation-paused]].
- 2026-09-28: 구현 재개·완료. backend 1~3차(83fad79, a1db114, cf02f65), 추천 공지 API 보충(d8d967c — dev-task 목록 누락분), 프로필 null 허용 구현 수정(b0085a4), frontend A·B(e1f0e0c, 8d4dff9). code-review 차단 1건(선호 수정 가림 누락 [[anyang-preferences-put-missing-mask-pii]]) → backend 수정 622962b → 재검수 통과. npm test 103개·build 통과(외부 자원은 모킹, 실제 DB·브라우저 확인은 못 함). 설계 변경 필요 2건(확인 항목 22·23)으로 [[anyang-backend-api]]를 승인된 설계에서 뺌.

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
9. 공지 자격요건 구조화 컬럼 — 해결(2026-09-27, user): 1차 출시에서 안 함. [[anyang-service-scope]]
10. "AI가 기억하는 내 정보" 화면 — 해결(2026-09-27, user): 넣는다, 조회·수정·삭제. [[anyang-service-scope]]
11. 대화 히스토리 목록 화면 — 해결(2026-09-27, user): 넣는다. [[anyang-service-scope]]
12. 인증 부가 테이블 — 해결(2026-09-27, user): 쓰지 않는다. [[anyang-service-scope]]
13. UNO Q 전환 시 HTTPS 확보 방법(리버스 프록시/터널) — 현재 UNO Q 미사용이라 설계 범위 밖, 전환 시 별도 조사.
14. 탈퇴 시 동의 기록 — 해결(2026-09-27, user): 증빙용으로 1년 보관 후 정리 잡으로 삭제. [[anyang-service-scope]]
15. 동의 항목 — 해결(2026-09-27, user): "수집·이용"과 "국외 이전"을 분리. [[anyang-service-scope]]
16. 비밀번호 재설정 — 해결(2026-09-27, user): 1차 출시 제외, Google 로그인으로 대체 안내, 이메일 발송 수단 불필요. [[anyang-service-scope]]
17. 알림 잡 중복 발송 방지 — `notify_logs`의 `unique(user_id, notice_id)`(database 제안). 설계 승인으로 확정. [[anyang-database-schema]]
18. 처리방침 개정 시 재동의 — 해결(2026-09-27, user): 강제한다. [[anyang-service-scope]]
19. 프로필 코드값 셋 — 해결(2026-09-27, user): 설계 제안값을 따르고 설계 승인으로 확정. 이후 사용자가 코드 식별자를 직접 확정(2026-09-27, user): 직군(업종·직무)과 재학/재직 여부 분리. 목록은 [[anyang-service-scope]]. [[anyang-database-schema]]
20. 로그 보존 — 해결(2026-09-27, user): 수집 이력·API 사용량 90일 정리 잡 등록, 알림 발송 로그는 삭제 대상에서 제외. [[anyang-service-scope]]
21. 발송 로그 `pending` 상태 — 해결(2026-09-27, user): 추가. 세부는 database·backend 설계. [[anyang-service-scope]]
22. **설계 변경 필요(2026-09-28, 구현 중 frontend 제기)**: 채팅 공지 인용 카드. [[anyang-frontend-screens]] 3절은 AI 응답 속 관련 공지를 카드(제목 + `/notices/[id]` 링크)로 보여 주는데, [[anyang-backend-api]] 3절 `POST /api/chat`에는 인용 공지 정보를 클라이언트로 보내는 계약이 없다(구현은 DeepSeek SSE를 그대로 전달). 선택지: (a) 스트림에 인용 공지 목록을 담는 계약 추가(backend-api 수정), (b) 1차 출시에서 인용 카드 제외(frontend-screens 수정). 그래서 [[anyang-backend-api]]를 "승인된 설계"에서 뺐다. 사용자 재승인 필요. 현재 구현은 인용 카드 없이 텍스트만 표시.
23. **설계 변경 필요(2026-09-28, 구현 중 frontend 제기)**: 관리자 공지 숨김 대상 선택. [[anyang-frontend-screens]] 관리자 공지 수집 관리는 공지 목록 탭에서 숨김/해제하는데, [[anyang-backend-api]] 13-1절에는 `PATCH /api/admin/notices/:id/hide|unhide`만 있고 관리자용 공지 목록 조회 API가 없다. 선택지: (a) `GET /api/admin/notices`(숨김 포함, 페이지네이션) 추가, (b) 숨김을 공지 상세 등 다른 경로에서 수행. 사용자 재승인 필요(22와 함께). 현재 구현은 실행 이력·수동 수집만 있고 숨김 UI 없음.

## 승인된 설계

기준 커밋 `ef51d3c`. 문서 안의 (미확정) 제안값도 함께 확정. 확정하지 않겠다고 한 값 없음.

- [[anyang-database-schema]] — 승인일 2026-09-27, 승인자 user
- [[anyang-frontend-screens]] — 승인일 2026-09-27, 승인자 user
- [[anyang-backend-tasks]] — 승인일 2026-09-27, 승인자 user
- [[anyang-frontend-tasks]] — 승인일 2026-09-27, 승인자 user

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
- [[2026-09-27_anyang-implementation-paused]]
- [[anyang-preferences-put-missing-mask-pii]]
