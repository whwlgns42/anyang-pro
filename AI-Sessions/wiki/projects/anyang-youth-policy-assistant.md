---
type: project
date: 2026-09-27
status: active
owner: pm
---

# 안양 청년정책 AI 리서치 비서

## Summary

안양시 청년정책 공지 중 사용자 프로필·대화 이력에 맞는 것만 골라 주고, 사용자가 정한 시각에 새 공지를 Web Push로 알리는 PWA 웹앱이다. 현재 단계: 1차 구현·검수 완료(2026-09-28). 설계 변경 2건(22·23) 설계 draft 완료·재승인 대기(2026-09-28), 외부 자원 준비 후 실제 환경 확인 필요.

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
- 2026-09-28: 재개. backend가 수집기 셀렉터를 실제 게시판 구조로 수정(766ea20). 사용자 결정 22·23·OCR·taste-skill 기록. 22·23 설계(backend → frontend) draft 완료 — backend-api 3-2절 인용 공지 SSE(`event: citations`)·13-1절 `GET /api/admin/notices`, frontend-screens 3절 인용 카드·11절 공지 목록 탭, tasks 두 문서에 작업 추가. code-review 지적으로 backend-api 5절·backend-tasks 5번 수집기 서술을 확인 사실로 갱신. frontend가 taste-skill(`design-taste-frontend`)로 시각 개선(1b27f0e, 공통 토큰·로그인·온보딩·동의·채팅·공지 피드, 관리자 화면은 토큰 반영만). code-review 통과(경미 1건: consent-form 인라인 style 잔존), npm test 104개·build 통과. errors 문서 status active로(code-review). 설계 문서 4종 재승인 대기, 22·23 구현은 재승인 뒤.
- 2026-09-28: 사용자가 22·23 설계 4종 재승인(기준 커밋 `f525792`). 구현: backend ccd6042(인용 공지 SSE, `GET /api/admin/notices`), frontend ed7c751(taste-skill 호출, 인용 카드, 관리자 공지 목록 탭, consent-form 인라인 style 정리). code-review 통과(차단 없음), npm test 120개·build 통과(실제 DB·브라우저 확인은 못 함). 경미 문서 결함 1건은 설계 잠금 대상이라 확인 항목 26으로 올림.
- 2026-09-28: 메인 세션 최종 검토(HEAD a8083ee) 반영. 구현 수정: database 65043e5(collect_runs.triggered_by on delete set null, 0016), backend d3a3a21(수집 잡 끝에서 임베딩 호출, 공지별 예외 처리·제목+본문 임베딩, chat 저장 after(), .env.example, vercel.json icn1, 410 구독 삭제, 공지 변경 시 재임베딩, 풀 max 3, 유선전화 가림), frontend 37c0d30(sw.js payload 정합). code-review 재위임 1회: backend 992e01e(maxDuration 300 — [[anyang-jobs-collect-missing-maxduration]]), frontend b5c575a(sw.js 실제 소스 테스트). 재검수 통과, npm test 132개·build 통과. Gemini 재시도·백오프와 선호 누적은 이미 설계대로라 수정 없음. 설계 변경 필요 28·29, 확인 30·31, 추천·알림 프로필 미사용은 27 보류.
- 2026-09-28: 사용자 결정 26·28~31. 하네스 설계 잠금이 괄호 안 미확정 삭제 허용(bdacfa0, 메인 세션 변경). 설계(database → backend → frontend) 반영 후 재기록, 구현: database 62b2e62(0017 auth_attempts, 0018 failed_device_count, 정리 잡 미등록 파일), backend a953dbc(나이대 구간, 비밀번호 8자, 로그인·가입 시도 제한, 다기기 판정), frontend 859df5c(taste-skill 호출, 8자 안내·429 배너). backend-api 비문·앵커 복구, payload·환경변수 명시. code-review 통과(재위임 없음), npm test 170개·build 통과, lint WARN 0. 에이전트 제안값은 확인 항목 32로 승인 대기. 기존 승인값의 괄호 안 (미확정) 표기는 database·frontend가 "애매하면 남김"으로 대부분 남겨 둠.
- 2026-09-28: 사용자가 확인 항목 32 승인(정리 잡 pg_cron 등록은 보류), 27 보류 해제 → 33 설계. 설계 5종을 승인된 설계에서 빼고 database(app_settings·notice_profile_matches, 0019·0020 계획) → backend(6-1절 Jev 매칭, 13-0-1절 관리자 설정 API, TYPESAFE_API_KEY) → frontend(10-1절 /admin/settings 토글, API 사용량 Jev) draft. 기존 확정값의 괄호 안 (미확정) 표기 정리(database 40·backend 45·frontend 88건). TypeSafe JS/HTTP 호출 형태·처리 국가·재동의 여부는 웹 확인 도구가 없어 확인 필요로 남음. 33 구현은 사용자 승인 뒤.
- 2026-09-28: 사용자가 27·33 취소. 각 소유자가 33 내용 제거(database·backend·frontend 설계 문서, pm 결정 문서 행), 5종 status active, 승인된 설계 재기록.
- 2026-09-28: 사용자 피드백(로그인 화면 중앙 정렬 안 됨·허전함)으로 frontend 시각 개선 ca0e5c9(taste-skill 호출). 로그인 데스크톱 2단(소개·핵심 가치 3개 + 카드), 모바일 1단, 로고 마크·한 줄 소개·G 아이콘·"또는" 구분선·처리방침 링크, /consent·/onboarding·/suspended 공통 중앙 카드 레이아웃(/post-login은 리다이렉트 전용이라 제외). 기능·API·흐름 변경 없음. npm test 170개·tsc 통과, **npm run build는 개발 서버(3100)와 .next 충돌 우려로 미실행**.
- 2026-09-28: 사용자 요청으로 database가 Supabase MCP로 `web/db/migrations/` up 파일 19개(0000_extensions ~ 0018_notify_logs_failed_device_count)를 순서대로 원격 DB에 적용 — 전부 성공, 건너뜀·실패 없음(적용 전 빈 프로젝트). migrate.sh와 같은 추적을 위해 각 적용에 `public.schema_migrations` 기록을 함께 넣음(19개 version). public 테이블 17개(schema_migrations 포함). `web/db/jobs/`(pg_cron 트리거·정리 잡)와 down 파일은 적용 안 함. 저장소 파일 변경 없음. 확인 항목 34·35.
- 2026-09-28: 사용자 결정 34(운영용)·35(공개 API 차단, 확장성). [[anyang-database-schema]]를 승인된 설계에서 빼고 database 설계 draft — "공개 API 차단" 절, 0019_lock_public_api 계획(up/down), 점검 SQL 2개·migrate.sh exit 1·MCP 적용 후 점검+get_advisors, 운영 기준 테스트 방법. 첫 호출은 pm이 "승인된 설계" 절 설명 문장에 위키링크를 남겨 설계 잠금 훅에 막혔고, 백틱 표기로 고친 뒤 재호출. 재승인 대기, 0019 구현·적용은 재승인 뒤. 새 확인 항목 36.
- 2026-09-28: 사용자 재승인(database-schema, 35 반영본), 승인된 설계 재기록. database 구현: 0019_lock_public_api up/down 작성, migrate.sh up 끝에 점검 2개(실패 시 테이블 이름 출력·exit 1), 설계 문서 (미확정) 2곳 제거. **적용 전 점검에서 멈춤** — 테이블 소유자는 `postgres`(단일)로 확인했지만 로컬 `web/.env.local`에 `DATABASE_URL`이 없어 앱 접속 롤을 확정하지 못함. 운영 적용·검증·코드 커밋·code-review 미진행(0019 파일과 migrate.sh는 작업 트리에 미커밋). 확인 항목 37.
- 2026-09-28: 37 해결(user, 접속 롤 = postgres Direct connection). database가 0019를 운영 DB에 단일 트랜잭션으로 적용·검증(점검 2개 0행, anon 42501, `_probe` rollback), npm test 170개·build 통과, 커밋 1b22f09. code-review 구현 수정 1건(up/down 파일에 begin/commit) → e6330a8, 재검수 통과. 35 해결. 남은 일: 메인 세션의 `get_advisors` 실행, 36(개발용 프로젝트에서 down→up) 보류.
- 2026-09-28: 메인 세션이 사용자 요청으로 Vercel 배포 시작. 프로젝트 `anyang-youth-policy-assistant` 생성(icn1), framework Other→nextjs 수정 후 미리보기 배포 정상(`/` 307, `/login` 200). 첫 배포가 운영에 배정돼 운영 주소는 404 버전 — `--prod` 재배포 필요. 환경변수 6개 등록(AUTH_SECRET·SCHEDULER_SHARED_SECRET·VAPID 3개·APP_ORIGIN, 값 미보관). 접속 정보는 사용자 요청으로 로컬 전용 `AI-Sessions/private/anyang-credentials.md`(git 제외)에 기록. 실패 사례 [[anyang-vercel-first-deploy-pitfalls]].
- 2026-09-28: 사용자 새 요청(/consent 국외 이전 고지·DeepSeek 문구 제거). 기존 결정(15·18, service-scope·ai-models-data-transfer)과 충돌, 법적 근거·범위 모순이 있어 분배 전 멈춤. 확인 항목 41.
- 2026-09-28: 41 답(user, 메인 세션 전달) 기록, 결정 문서 2건 갱신. frontend-screens·frontend-tasks를 승인된 설계에서 빼고 frontend 설계 draft(7절 동의 legend "AI 활용 동의 (필수)"·라벨, 9절 처리방침 문구, 테스트에 문자열 부재 확인, 제안값은 frontend-screens 확인 항목 2). 재승인 대기, 구현은 재승인 뒤. 법적 요건(41-b)은 답 없음. 설계 문서 커밋 ddb7192(프로젝트 문서·service-scope·log는 메인 세션 미커밋 변경과 섞여 있어 미커밋).
- 2026-09-28: 41 재승인(user, 법적 위험 감수) 기록, 승인된 설계 8차. frontend 구현 9f65aeb(동의 legend·라벨, 처리방침 "AI 처리" 절, 금지 문자열 테스트 2건, 설계 2종 active). npm test 172개 통과, **npm run build는 dev 서버(3100) 충돌 우려로 미실행인데 커밋됨**(log flag). code-review: 치명 없음, 문구·필드·검증·API 불변 확인. 경미 3건은 확인 항목 42.
- 2026-09-28: Vercel 프로젝트 변경 — 메인 세션이 만든 `anyang-youth-policy-assistant`가 세션 밖에서 삭제되고 `web` 프로젝트(로컬 `web/.vercel` 연결)가 생겨 이후 `web`을 사용(user 지시 "vercel에도 배포해줘"). 운영 환경변수 9개 정리(구글 값은 Google 토큰 엔드포인트로 유효 확인, localhost `AUTH_URL` 제거, 비밀값 새로 생성), `vercel deploy --prod` → https://web-beta-smoky-16.vercel.app 로그인 없이 `/login` 200, `/api/auth/providers` 200(google·credentials). 런타임 DB 접속은 미검증(같은 주소로 로컬 접속만 확인).
- 2026-09-29: 사용자가 운영에서 구글 로그인 성공 — 운영 DB에 users 1·accounts 1(google)·consents 2·profiles 1 기록 확인(개수만 조회), 운영 오류 로그 없음. `DEEPSEEK_API_KEY`(모델 목록·최소 호출 확인)·`GEMINI_API_KEY`(`gemini-embedding-001` 호출 200) Vercel `web` 운영·`web/.env.local` 등록 후 운영 재배포(Ready, `/login` 200). 운영 환경변수 11개. 코드의 `deepseek-chat`은 API가 `deepseek-flash`로 응답하는 별칭 — 확인 항목 41.
- 2026-09-29: 사용자 새 요청(채팅이 이름을 기억 못 함). 원인 3개와 사용자 결정 2건을 확인 항목 43에 기록, [[anyang-ai-models-data-transfer]] 갱신, 설계 5종을 승인된 설계에서 뺌(9차). 설계 draft 완료(database 스키마 변경 없음, backend 기억 주입·매 답변 추출, frontend 안내·처리방침 문구). 재승인 대기, 구현은 재승인 뒤.

### 설계 문서

5종 모두 확인 항목 43 설계 수정으로 재승인 대기(2026-09-29).

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
    - 22 해결(2026-09-28, user): (a) 넣는다 — 채팅 스트림으로 인용 공지 목록(id·제목·원문 URL·게시일)을 보내는 계약을 [[anyang-backend-api]] 3절에 추가. 계약 세부는 backend 제안(미확정), 설계 재승인으로 확정.
    - 23 해결(2026-09-28, user): (a) `GET /api/admin/notices`(숨김 포함, 페이지네이션) + 관리자 공지 목록 화면에서 숨김/해제. 세부는 설계 재승인으로 확정.
24. 포스터 이미지 OCR — 나중에 결정(2026-09-28, user). 1차는 공지 제목+본문만 임베딩, 실제 수집 데이터로 매칭 품질 확인 후 재검토.
25. frontend UI 개발에 taste-skill(`design-taste-frontend`) 사용 — 해결(2026-09-28, user). 적용 범위는 랜딩·첫 화면·시각 톤, 관리자 표 화면은 가독성·일관성만.
26. **사용자 결정 필요(2026-09-28, code-review 지적)**: 재승인 뒤 backend가 [[anyang-backend-api]]의 `(미확정)`을 기계적으로 지우면서 문장 1곳이 비문이 되고(940행 "제안값이며이다"), 원래 줄바꿈에 걸려 있던 위키링크 앵커 몇 곳(409·500·541행 등)에 공백만 남았다. 의미·계약 변경은 없다. 고치려면 승인된 설계 내용 수정이라 설계 잠금 대상이다. 선택지: (a) 그대로 둔다, (b) 문구·앵커만 고치는 수정을 허용(문서를 승인된 설계에서 잠시 빼고 수정 후 재승인). 권장 (b), 확인 항목의 "(미확정) 표기 잔존 → 훅을 좁게 수정" 결정과 함께 처리. [[anyang-backend-api-mihwakjeong-removal-corruption]]
27. **보류(2026-09-28, user)**: 추천·알림이 프로필을 쓰지 않는다([[anyang-backend-api]] 7절 알림 매칭은 선호 벡터 유사도만). 그래서 채팅 전 사용자는 추천 피드가 최신순뿐이고 알림은 0건이다 — 원 요청("프로필·대화 이력에 맞는 것만")과 어긋난다(메인 세션 최종 검토 지적). 해결 제안: 프로필 조건 × 공지 해당 여부를 Jev Noul로 판정(설계 변경). 사용자 지시로 보류, 구현하지 않는다.
    - 보류 해제(2026-09-28, user): 설계 단계로 진행 — 확인 항목 33.
    - **취소(2026-09-28, user)**: 33과 함께 하지 않는다. 선호 없는 사용자는 기존대로 추천 최신순·알림 없음.
28. **설계 변경 필요(2026-09-28, 최종 검토 수정 중 backend 분류)**: 채팅 DeepSeek 프롬프트에 출생연도 원값이 간다. [[anyang-backend-api]] 3절 확정 원칙은 "나이대"인데 나이대 구간 정의가 설계·코드에 없다(관리자 통계의 10년 단위 예시는 "구간 폭 미확정"). 구간(예: 5년/10년) 결정 필요. 현재 원값 전송 유지.
29. **설계 변경 필요(2026-09-28, 동일)**: 비밀번호 최소 길이, 로그인·가입 시도 횟수 제한 값이 설계에 없다. 값 결정 필요. 현재 미적용.
30. **설계 확인(2026-09-28, 동일, 차단 아님)**: 한 사용자가 기기 여러 대를 등록했을 때 일부 기기만 푸시 성공하면 `notify_logs`를 success/failed 중 무엇으로 볼지 설계 7절에 없다. 현재 "모든 기기 성공해야 success" 유지(410/404 만료 구독은 삭제하고 실패로 세지 않음).
31. **문서 보완 필요(2026-09-28, 차단 아님)**: [[anyang-backend-api]]에 없는 구현 사실 2건 — Web Push payload 스키마 `{title, notice_id}`(8절, sw.js는 `/notices/[id]`로 이동), 환경변수 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`(9절 표). 승인된 설계라 잠겨 있어 26번과 함께 문서 수정 허용 여부 결정 필요.
    - 26·31 해결(2026-09-28, user): 고친다 — backend-api 비문·앵커 공백 복구(의미 변경 없음), push payload `{title, notice_id}` 명시, 환경변수 표에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 추가. 설계 잠금 훅은 괄호 안 "미확정" 삭제를 허용하도록 바뀜(bdacfa0) — 승인된 값의 괄호 안 표기도 정리.
    - 28 해결(2026-09-28, user): 나이대 = 19세 미만 / 19~24 / 25~29 / 30~34 / 35~39 / 40세 이상(만 나이, Asia/Seoul 기준 현재 연도 − birth_year). DeepSeek에는 구간 문자열만. 경계 처리는 backend 제안. [[anyang-ai-models-data-transfer]]
    - 29 해결(2026-09-28, user): 비밀번호 최소 8자. 로그인 실패는 같은 이메일 또는 같은 IP 기준 15분에 5회 초과 시 일시 차단, 가입은 같은 IP 15분에 5회 초과 시 일시 차단. 외부 서비스 없이 DB 기록(database가 테이블·정리 방식 설계, 새 마이그레이션). 응답 코드·메시지는 backend 제안.
    - 30 해결(2026-09-28, user): 기기 중 한 대라도 성공하면 success, 실패 기기 수를 함께 기록(컬럼 여부는 database 제안).
    - 27은 보류 유지(user).
    - 26·28~31 반영·구현 완료(2026-09-28): 62b2e62, a953dbc, 859df5c. code-review 통과.
32. **사용자 승인 필요 — 이번 라운드 에이전트 제안값(2026-09-28, (미확정)인 채 구현, 사용자 지시)**:
    - database([[anyang-database-schema]] auth_attempts·notify_logs): `auth_attempts(id, attempt_type, identifier_type, identifier_hash, created_at)` + 복합 인덱스, 이메일·IP는 SHA-256 해시로 저장, 로그인 실패 시 email·ip 각 1행·가입은 성공 포함 ip 1행·로그인 성공 미기록, 차단 해제 시각 컬럼 없이 15분 슬라이딩 윈도우, 보존 1일 + 매시간 정리 잡(`UNAPPLIED_cleanup-auth-attempts.sql`, pg_cron 미등록 — 되돌릴 수 없는 삭제라 등록 승인 필요), `notify_logs.failed_device_count integer not null default 0`.
    - backend([[anyang-backend-api]] 1-6·3·7절): 429 `{ error: "TOO_MANY_ATTEMPTS" }`(로그인·가입), 400 `{ error: "PASSWORD_TOO_SHORT" }`, IP = `x-forwarded-for` 첫 값·없으면 `127.0.0.1`(Vercel에서 위조·공유 버킷 위험은 공식 문서 확인 필요 — code-review), 로그인 차단은 Auth.js `CredentialsSignin` 서브클래스 code `TOO_MANY_ATTEMPTS`, `birth_year` null이면 나이대 조건 생략, 만료(410/404) 구독은 성공·실패 어느 쪽에도 세지 않음. 동시 요청 시 5회 경계를 약간 넘을 수 있는 레이스(count 후 insert) 허용.
    - frontend([[anyang-frontend-screens]] 1-1절): 가입 모드 비밀번호 힌트 상시 노출 "비밀번호는 8자 이상이어야 합니다."(인라인 오류 같은 문구), 429 배너 "잠시 후 다시 시도해 주세요."(401 오류와 구분).
    - 32 해결(2026-09-28, user): 위 제안값 전부 확정. 단 `cleanup-auth-attempts` pg_cron **등록**은 보류(DB 연결 후 결정, 다른 정리 잡과 같음). x-forwarded-for: Vercel은 이 헤더를 자체 값으로 덮어써 위조할 수 없다(메인 세션 확인, https://vercel.com/docs/headers/request-headers). 보드 서버(UNO Q) 등으로 이전하면 프록시 구성에 따라 다시 검토한다.
33. 27 후속 — 프로필 기반 Jev 매칭 설계(2026-09-28, user 결정): 프로필 조건 × 공지 대상 여부를 Jev(Noul)로 판정. 관리자 화면 토글로 켜고 끔(기본 OFF). 적용 대상은 선호(기억)가 없는 사용자만, 선호가 있는 사용자는 기존 벡터 유사도. 장애·키 없음이면 OFF와 같은 동작. 설계 draft 후 사용자 승인, 구현은 승인 뒤. 전송 범위는 [[anyang-ai-models-data-transfer]].
    - 설계 draft 완료(2026-09-28): [[anyang-database-schema]] app_settings·notice_profile_matches, [[anyang-backend-api]] 6-1·13-0-1절, [[anyang-frontend-screens]] 10-1절, tasks 두 문서. 재승인 대기.
    - **취소(2026-09-28, user)**: 하지 않는다. 처리방침 반영도 불필요.
34. **사용자 확인 필요(2026-09-28, 마이그레이션 적용 후 database 제기)**: Supabase MCP가 연결된 프로젝트의 이름·ref가 MCP 응답에 나오지 않아, 19개 마이그레이션이 적용된 곳이 개발용 프로젝트인지 운영용인지 확인하지 못했다([[anyang-deployment-portability]]는 개발/운영 분리). 사용자가 Supabase 대시보드에서 확인 필요.
35. **설계 결정 필요(2026-09-28, 동일)**: 새 테이블 17개 모두 RLS가 꺼져 있다. Supabase는 public 스키마를 Data API로 노출하므로 anon 키로 모든 행을 읽고 쓸 수 있다는 경고가 나왔다(Supabase MCP `list_tables` 경고). [[anyang-database-schema]]에는 RLS·Data API 노출에 대한 설계가 없다. 앱은 `DATABASE_URL` 서버 접속만 쓰므로 선택지 예: (a) 모든 테이블 RLS 활성화 + 정책 없음(서버 접속 역할은 영향 없음, anon·authenticated 차단), (b) Data API에서 public 스키마 노출 해제. 설계 변경이라 database 설계 → 사용자 승인 필요. 그때까지 노출 상태이며 실제 개인정보를 넣기 전에 결정해야 한다. b39f76a로 설계 문서·결정 문서에 넣은 33 내용은 모두 제거했다(32 승인 반영·(미확정) 표기 정리는 유지). 재검토용 메모는 "Jev 도입 제안" 절에만 둔다.
    - 34 해결(2026-09-28, user): 19개 마이그레이션이 적용된 곳은 **운영용** Supabase 프로젝트다. 이후 작업도 운영용으로 진행한다.
    - 35 해결(2026-09-28, user): 확장성(테이블 추가·수정, 기능 확장 뒤에도 유지)이 요구사항. 방향 — 새 마이그레이션 `0019_lock_public_api`(up/down): public 테이블 전체 RLS 켜기·정책 없음, anon·authenticated 롤이 있을 때만(DO 블록) 현재 테이블·시퀀스·함수 권한 회수, `alter default privileges for role postgres in schema public revoke ...`로 미래 객체 권한 선회수. 적용 후 점검 SQL 2개(RLS 꺼진 테이블 0행, anon 권한 테이블 0행)를 `migrate.sh up` 끝에서 실행해 실패 시 exit 1, MCP 적용 뒤에도 같은 점검 + `get_advisors`. 설계 문서에 "공개 API 차단" 절(새 테이블 마이그레이션은 같은 파일에서 RLS 켜기, 클라이언트 직접 접근은 설계 변경). 운영 기준 검증: 단일 트랜잭션, 적용 전 테이블 소유자=접속 롤 점검(불확실하면 멈춤), `_probe`는 begin~rollback 안에서만, 운영에서 down→up 반복 테스트 안 함(36). 대시보드 Data API 토글은 배포 체크리스트의 선택 사항. 그래서 [[anyang-database-schema]]를 "승인된 설계"에서 뺐다(사유: 35 반영). database 설계 draft 후 사용자 재승인, 구현은 재승인 뒤.
    - 설계 draft 완료(2026-09-28, database): [[anyang-database-schema]] "공개 API 차단" 절·0019 계획·테스트 방법. database 제안값(미확정): 점검 SQL 2개의 정확한 문구, `migrate.sh up` 실패 출력 형식 — 재승인으로 확정할지, 구현 단계에서 정할지 사용자 결정 필요.
    - 재승인(2026-09-28, user): "설계 끝나면 바로 승인하고 운영에 적용해줘". 위 제안값 2건은 문서에 적힌 값 그대로 확정. 구현·운영 적용 진행.
    - 35 해결(2026-09-28): 0019_lock_public_api 운영 적용 완료(단일 트랜잭션, schema_migrations 기록). 점검 SQL 2개 0행, anon으로 public.users 조회 시 permission denied, `_probe`(rollback) anon 권한 없음. 코드 커밋 1b22f09, code-review 지적(파일에 begin/commit 없음) 수정 e6330a8, 재검수 통과. `get_advisors`는 메인 세션 대상(미실행).
36. **보류(2026-09-28, 35 후속)**: `0019_lock_public_api` down→up 반복 적용 테스트는 운영 DB에서 하지 않는다(되돌리는 동안 공개 키 접근이 다시 열림). 개발용 Supabase 프로젝트가 생기면 그곳에서 실행한다. 그때까지 down 파일은 문법 검토만.
37. **사용자 확인 필요(2026-09-28, 0019 적용 전 점검에서 database 제기)**: 운영 앱의 `DATABASE_URL`(Vercel 환경변수 등) 접속 롤이 public 테이블 소유자 `postgres`와 같은지. 로컬 `web/.env.local`에는 `DATABASE_URL`이 없어(키: `AUTH_SECRET`, `AUTH_URL`뿐) 확인할 수 없었다. Supabase pooler 연결 문자열이면 사용자명이 `postgres.<ref>` 형식이고 롤은 `postgres`다(비밀번호는 알려주지 않아도 된다 — 사용자명 부분만 확인). 다른 롤(예: 별도 앱 전용 롤)이면 정책 없는 RLS가 앱 쿼리를 막아 운영 장애가 되므로 설계 재검토. 확인되면 database 구현 재호출로 단일 트랜잭션 적용 → 점검·검증 → 커밋 → code-review. 아직 앱을 운영에 배포하지 않아 `DATABASE_URL`을 정하지 않은 상태라면 그 사실도 알려 주면 된다(그때는 "소유자 롤 `postgres`로 접속"을 배포 조건으로 두고 적용할지 결정).
    - 37 해결(2026-09-28, user): 접속 롤 = postgres(Direct connection), 사용자 확인. 테이블 소유자와 같다. 접속 문자열·비밀번호·project ref는 어디에도 남기지 않는다. database 구현 재호출로 0019 운영 적용 진행.

38. **사용자 입력 필요(2026-09-28, Vercel 배포)**: 운영 환경변수 남은 7개 — `DATABASE_URL`(Transaction pooler 6543, 메인 세션이 넣을 수 있음·사용자 답 대기), `GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET`·`DEEPSEEK_API_KEY`·`GEMINI_API_KEY`·`ADMIN_EMAILS`(사용자가 직접 입력). Google OAuth 리디렉션 URI `https://anyang-youth-policy-assistant.vercel.app/api/auth/callback/google` 등록 필요. 입력 뒤 `vercel deploy --prod`.
    - 갱신(2026-09-28): 프로젝트가 `web`으로 바뀜. 등록 완료 9개(DATABASE_URL·AUTH_SECRET·SCHEDULER_SHARED_SECRET·VAPID 3개·APP_ORIGIN=`https://web-beta-smoky-16.vercel.app`·GOOGLE 2개), 운영 배포 완료. 남은 것: `DEEPSEEK_API_KEY`·`GEMINI_API_KEY`·`ADMIN_EMAILS`(사용자 입력), 구글 콘솔 리디렉션 URI `https://web-beta-smoky-16.vercel.app/api/auth/callback/google` 등록(사용자). 없으면 채팅·임베딩·관리자 기능 불가.
    - 갱신(2026-09-29): 구글 리디렉션 URI 등록·로그인 성공(user), DEEPSEEK·GEMINI 등록·재배포 완료. 남은 것: `ADMIN_EMAILS`(사용자 입력).
39. **사용자 결정 필요(2026-09-28, Vercel 배포)**: 프로젝트에 Vercel Authentication(ssoProtection `all_except_custom_domains`)이 켜져 있어 `*.vercel.app` 운영 주소도 Vercel 로그인 사용자만 열 수 있다. 일반 사용자와 pg_cron 수집·알림 트리거가 막힌다. 운영만 해제(미리보기는 보호 유지)할지 결정.
    - 정정(2026-09-28, 메인 세션 실측): 로그인 없이 `curl`로 확인한 결과 운영 도메인 `anyang-youth-policy-assistant.vercel.app`은 SSO로 넘어가지 않고 앱이 직접 응답(현재는 첫 배포라 404), 미리보기·배포별 주소만 `vercel.com/sso-api`로 302. 즉 운영은 이미 공개 상태라 해제할 것 없음. `--prod` 배포 후 로그인 없이 200인지 다시 확인한다.
40. **후속(2026-09-28, 38 이후)**: 예약 작업(collect/notify 트리거) 등록 시 `SCHEDULER_SHARED_SECRET`을 새로 만들어 Vercel과 Supabase Vault에 동시에 넣는다(2026-09-28 생성값은 보관하지 않음).
41. **사용자 결정 필요(2026-09-28, 새 요청 — /consent에서 국외 이전 고지·DeepSeek 문구 제거)**: pm이 분배 전에 멈춤. 설계·코드 변경 없음, "승인된 설계" 기록도 그대로 둠. 확인할 것:
    - (a) **기존 사용자 결정과 충돌**: 15번(user, "수집·이용"과 "국외 이전" 분리 동의)과 [[anyang-service-scope]] "개인정보 동의" 행(DeepSeek·Gemini 국외 이전 고지), [[anyang-ai-models-data-transfer]] "동의 화면의 국외 이전 고지에 Gemini 전송 포함"을 뒤집는 결정인지. 뒤집는다면 결정 문서 2건을 고친다(pm 소유).
    - (b) **법적 근거**: 실제 전송(채팅 → DeepSeek 국외 서버, 임베딩 → Gemini 국외)은 그대로다. 개인정보 보호법 제28조의8은 국외 이전 시 별도 동의 또는 (계약 이행에 필요한 처리위탁·보관이면) 처리방침 공개·고지 같은 요건을 둔다. 어느 요건으로 갈지는 법적 판단이라 pm·에이전트가 정할 수 없다. 동의 화면에서 빼도 되는 근거(예: 처리방침 공개로 대체)를 사용자가 확인해야 한다.
    - (c) **범위 모순**: 요청은 "폼 필드·검증·API 호출은 바꾸지 않는다"인데, 국외 이전 고지는 필수 체크박스 `overseas_transfer`의 라벨 자체다(`web/app/consent/consent-form.tsx`, 백엔드 `CONSENT_TYPES` 필수 2종). 선택지: ① 체크박스·API는 두고 라벨만 DeepSeek·국가명 없는 문구로 바꾼다(대체 문구 필요), ② 국외 이전 체크박스를 없앤다(폼·검증·API·DB 동의 기록 변경 → database·backend·frontend 설계 변경), ③ 그대로 둔다.
    - (d) **처리방침 페이지**: `/privacy-policy`와 [[anyang-frontend-screens]] 처리방침 절에도 DeepSeek·국외 이전 고지가 있다. 요청 범위(동의 화면만)에 포함하는지. 법적 근거를 (b)의 처리방침 공개로 잡으면 처리방침에서는 빼면 안 된다.
    - (e) **재동의**: 18번(처리방침 개정 시 재동의 강제)과 `POLICY_VERSION`. 문구를 바꾸면 버전을 올려 기존 사용자에게 재동의를 받는지, 요청대로 기존 동의 기록을 유지하고 신규 가입자에게만 적용하는지(버전 유지).
    - 답을 받으면 해당 설계 문서를 "승인된 설계"에서 빼고 설계(필요한 에이전트만, database → backend → frontend) → 사용자 재승인 → 구현 → code-review 순으로 진행한다. 설계와 구현을 한 호출에 묶는 것은 승인 게이트(Kickoff 3) 때문에 하지 않는다.
    - 답(2026-09-28, user, 메인 세션 전달): (a) 뒤집는다 — 화면 표현만 단순화. (c) ① 체크박스 `overseas_transfer`·API 필수 검증 유지, 라벨·설명에서 국가명(중국·국외·미국)·서비스명(DeepSeek·Gemini)·상세 고지 제거, "AI가 대화 내용을 처리합니다" 수준 문구. (d) `/privacy-policy`도 같은 방식. (e) 기존 동의 기록 유지, 신규 가입자에게만 새 화면(재동의 없음 → `POLICY_VERSION` 유지로 해석, 18번의 예외). 실제 전송(DeepSeek·Gemini 모두 국외)은 변하지 않음을 사용자가 인지.
    - **(b) 법적 근거는 답이 없다**: 동의 화면과 처리방침 모두에서 빼면 국외 이전 사실이 사용자에게 어디에도 고지되지 않는다. 또 `overseas_transfer` 동의 기록이 "국외 이전 동의"로 남지만 사용자는 그 사실을 안내받지 않고 체크하게 된다. 재승인 때 이 위험을 감수하는지(또는 법률 검토 후 진행하는지) 사용자 확인 필요.
    - 41-b 해결(2026-09-28, user, 메인 세션 전달): 법적 위험을 감수하고 진행한다. 설계 2종 재승인, 구현 진행.
    - 41 구현·검수 완료(2026-09-28): 9f65aeb, code-review 통과(치명 없음). build 확인만 남음(42-a).
42. **후속(2026-09-28, 41 검수)**:
    - (a) **메인 세션 확인 필요**: 9f65aeb가 `npm run build` 없이 커밋됨. dev 서버(3100) 중지 후 build 실행, 결과를 log.md flag 해결 줄로 남긴다.
    - (b) 사용자 결정 필요(경미, 설계 잠금 대상): [[anyang-frontend-screens]] 339~340행 수집·이용 라벨의 "(제안,↵미확정)"이 줄바꿈으로 나뉘어 훅이 표시 삭제를 허용하지 않아 남음(값은 기존 그대로 확정). 35행 "3차 개정(확인 항목 41, draft)" 서술도 active와 어긋남. 고치려면 문서를 승인된 설계에서 잠시 빼고 자구만 정리 후 재승인. 권장: 다음 설계 변경 때 함께 정리.
    - (c) 경미, 보류 가능: `web/test/consent-privacy-wording.test.ts`가 주석까지 검사해 나중에 주석에 서비스명을 적으면 깨진다. 현재 동작은 정상.
    - pm 판단: 사용자 전달문은 "설계 변경 없음"이지만 [[anyang-frontend-screens]] 7·9절과 [[anyang-frontend-tasks]]에 해당 문구가 확정값으로 적혀 있어 설계 변경이다(그대로 코드만 고치면 설계-코드 모순). 두 문서를 승인된 설계에서 빼고 frontend 설계 draft → 재승인 → 구현. database·backend 문서는 필드명 `overseas_transfer`와 "국외 이전" 동의 유형 의미만 담고 있어 이번 범위에서 고치지 않는다.

41. **확인 필요(2026-09-29, 메인 세션 제기, 차단 아님)**: `web/lib/deepseek.ts`의 모델명 `deepseek-chat`은 DeepSeek 제공 모델 목록(`deepseek-flash`, `deepseek-v4-pro`)에 없고 API가 `deepseek-flash`로 응답하는 별칭이다. 별칭이 없어지면 채팅이 멈춘다. 모델명을 `deepseek-flash`로 명시할지 사용자 결정 필요(설계 [[anyang-ai-models-data-transfer]]·[[anyang-backend-api]] 값 변경이라 설계 변경 절차). (번호 주의: 위 2026-09-28 41과 번호가 겹친다. 이후 항목은 43부터.)

43. **설계 변경(2026-09-29, 새 요청 — 채팅이 사용자를 기억하지 못함)**: 사용자가 채팅에서 이름을 알려준 뒤 새로고침·새 대화에서 물으면 기억하지 못한다. 기대 동작은 "대화가 쌓일수록 그 사용자를 아는 비서"(모델 재학습이 아니라 기억 문장 + 벡터 저장·주입). 메인 세션 원인 분석(코드·운영 DB 실측, 2026-09-29) — 버그가 아니라 설계의 빈틈:
    - (1) 핵심: `user_preferences`는 `buildQueryVector`로 공지 검색 벡터를 섞는 데만 쓰이고 시스템 프롬프트에 들어가지 않는다. 대화 이력도 현재 대화 메시지만 보낸다. [[anyang-backend-api]] 3절 2-a·5번이 선호를 "검색용 벡터"로만 정의.
    - (2) 추출 빈도: 한 대화의 메시지 수가 6의 배수일 때만 추출. 운영 DB 대화 5개(메시지 1·6·2·2·2) 중 추출 1번.
    - (3) 요약 프롬프트의 "식별정보는 포함하지 마" 지시로 이름이 빠짐(저장 문장 "사용자는 자신의 이름과 …"). [[anyang-ai-models-data-transfer]]의 이름 미전송 원칙이 그대로 적용된 결과.
    - 부수: 메시지 1개짜리 대화 1건(assistant 답변 미저장). 원인은 backend 확인.
    - 결정(2026-09-29, user, AskUserQuestion): ① 사용자가 대화에서 직접 알려준 이름·호칭까지 기억하고 DeepSeek에 전송 허용. 전화번호·이메일·주민번호는 계속 `maskPii`로 가림. ② 기억 추출은 AI 답변이 끝날 때마다. [[anyang-ai-models-data-transfer]] 갱신.
    - 진행: `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`·`anyang-frontend-screens`·`anyang-frontend-tasks`를 승인된 설계에서 뺐다(9차). 설계(database → backend → frontend) draft 후 사용자 재승인, 구현은 재승인 뒤. 내용 변경이 없는 문서는 기존 승인 그대로 다시 기록한다.
    - 설계 draft 완료(2026-09-29): 5종 모두 수정. 재승인 대기. 제안값(미확정):
      - database([[anyang-database-schema]] user_preferences 절): 스키마·인덱스·마이그레이션 변경 없음. 새 기억 문장은 같은 사용자 기존 기억과 코사인 유사도 0.92(거리 0.08) 이상이면 갱신, 아니면 추가. 동시 요청 레이스 허용(잠금 없음). 조회 2종(최근 N, 유사 K)은 user_id 필터 순차 스캔. 문서 frontmatter는 `status: active` 그대로 둠.
      - backend([[anyang-backend-api]] 2-3절·3절 2-a·5번·3-3·3-3-1·3-3-2절, [[anyang-backend-tasks]] 6번·선택 항목): 최근 5 + 유사 5(합계 최대 10, 최근 우선, 중복 제거), 시스템 프롬프트 "사용자 조건"과 "관련 공지" 사이에 기억 절, 기억 없으면 생략. 유사 조회 실패 시 최근만, 둘 다 실패 시 생략. `extractPreferences`가 JSON 문자열 배열을 출력하고 코드펜스를 뗀 뒤 파싱, 파싱 실패는 빈 배열. 추출 프롬프트 문구 제안. `PREFERENCE_EXTRACTION_EVERY_N_MESSAGES` 제거. 부수 관찰은 스트림 읽기 예외 시 `assistantText`를 버리는 경로를 확인했지만 실제 원인은 확인 불가. 예외 시 부분 저장은 선택 항목.
      - frontend([[anyang-frontend-screens]] 6·9절, [[anyang-frontend-tasks]] 9·11번): `/settings/memory` 구조 변경 없음, 안내 문구 추가. `/privacy-policy` "AI 처리" 절에 이름·호칭 기억 고지 문장 추가(서비스명·국가명 없음, 금지 문자열 테스트 준수).
    - 미해결 질문:
      - (a) 이름이 담긴 기억 문장이 임베딩 때 Gemini로 간다. 결정 원문은 "DeepSeek 전송 허용"뿐이라 Gemini 포함 여부 확인 필요.
      - (b) 스트림 예외 시 부분 답변 저장을 43 범위에 넣을지. 넣으면 사용자가 취소한 답변도 저장된다.
      - (c) 위 제안값을 재승인으로 확정할지.

## 승인된 설계

2026-09-28(4차): 33 취소(user)로 33 내용을 제거하고 5종을 다시 기록한다. 남은 변경은 확인 항목 32 승인값 반영과 괄호 안 (미확정) 표기 정리뿐이다. 문서 안의 값은 모두 확정이며, 정리 잡 pg_cron 등록만 사용자 결정 대기다.

2026-09-28(5차): `anyang-database-schema`를 뺀다 — 사유: 확인 항목 35(공개 API 차단) 반영을 위한 설계 수정. 재승인 뒤 다시 기록한다.

2026-09-28(6차): 사용자 재승인으로 `anyang-database-schema`를 다시 기록한다(35 반영본, 커밋 1e59171). 점검 SQL 문구와 `migrate.sh up` 실패 출력 형식은 문서에 적힌 값 그대로 이번 승인으로 확정. 확인 항목 36은 보류 유지.

2026-09-28(7차): `anyang-frontend-screens`와 `anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 41(동의 화면·처리방침의 국외 이전·서비스명 문구를 "AI 처리" 표현으로 단순화, 새 요청). 두 문서 7·9절과 작업 문서에 해당 문구가 확정값으로 적혀 있다. 재승인 뒤 다시 기록한다.

2026-09-28(8차): 사용자 재승인(메인 세션 전달)으로 `anyang-frontend-screens`·`anyang-frontend-tasks`를 다시 기록한다(draft 커밋 ddb7192). frontend-screens 확인 항목 2의 제안 문구(legend·라벨·가림 안내 유지·처리방침 문구) 전부 확정. 사용자가 41-b 법적 위험을 감수하고 진행.

2026-09-29(9차): 설계 문서 5종을 모두 뺀다 — 사유: 확인 항목 43(채팅 기억 주입·매 답변 추출·이름 기억, 새 요청). 설계 수정 후 재승인 뒤 다시 기록한다.

## Jev 도입 제안

2026-09-27 backend 검토: 선호 벡터 기반 "공지-사용자 관련성" 매칭은 코사인 유사도 임계값(결정적 계산)이라 해당 없음.

2026-09-28 (확인 항목 27·33) — **취소(2026-09-28, user)**. 아래는 재검토 때 참고할 기록이다. TypeSafe 참고(메인 세션 확인, 2026-09-28): 미국 호스팅, 입력으로 모델 학습 안 함, JS SDK `@typesafe-ai/sdk`, HTTP `POST https://api.typesafe.ai/v1/systemone`(Bearer), 모델 `jev-latest`.

```text
- 위치: /api/notices/recommended·/api/jobs/notify의 선호 0건 분기 ([[anyang-backend-api]] 6-1절)
- 판단: Noul — 프로필 조건 조합 × 공지 대상 해당 여부
- 속도: 현재 판정 없음(최신순/알림 없음) → Jev 약 0.6초/요청 (추정, 근거: 2026-09-28 메인 세션 하네스 실측 16문항 1.2초·단일 1.4초 중 SDK 로딩 제외). 서버 키로는 측정 불가(TYPESAFE_API_KEY 없음)
- 토큰: 측정 불가 (근거 없음 — 키 준비 후 대표 입력 1회 측정)
- 주의: 오판 시 대상 아닌 공지 알림 또는 누락. 캐시(notice_profile_matches)로 호출 수 = 새 공지 × 서로 다른 조건 조합 수. 외부 전송은 조건 조합과 공지 제목·본문뿐(식별정보·출생연도 원값 없음, [[anyang-ai-models-data-transfer]])
```

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
- [[anyang-backend-api-mihwakjeong-removal-corruption]]
- [[anyang-jobs-collect-missing-maxduration]]
- [[서비스-소개]]
