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
- 2026-09-29: 43 재승인(user: Gemini 전송 허용, 부분 답변 저장 포함, 제안값 전부 확정). 결정 문서 갱신, 승인된 설계 10차. backend가 43-b 단락 추가 후 구현 236d410(npm test 193개·build 통과). frontend 문구 구현은 테스트 174개 통과, dev 서버(3100) 때문에 build·커밋 대기(44). code-review 치명 없음. push 대기(45).
- 2026-10-03: overview 문서·코드 재검증(사용자 요청, 확인 항목 47). database·backend·frontend 조사, code-review 교차 검수. 채팅요청흐름 다이어그램만 최신 구현으로 갱신(매 답변 추출, 기억 주입, 0.08 갱신, 부분 답변 저장). 핵심 발견: 모순 선호는 정정되지 않고 공존(설계 범위 밖), 기억 화면 진입 경로 없음. 코드·설계 문서 변경 없음, 새 설계 draft 없음(전부 사용자 결정 대기). frontend 구현은 사용자 지시로 보류(팀원 앱 디자인 소스 적용 후 웹·앱 동시 구현으로 재개).
- 2026-10-03: 사용자 결정 47-a = (ii) 추출 시 대체. 확인 항목 48 설계 draft(database-schema 12차로 뺌 → database → backend). 확인 항목 49 cheongan 적용 조사 draft(frontend, 새 문서 [[anyang-cheongan-design-adoption]], 코드 변경 없음). 둘 다 사용자 승인 대기, 구현은 승인 뒤.
- 2026-10-03: 48 승인된 설계 13차 → 구현 완료. database 0020 운영 적용 226e4f6, backend 모순 대체 21b9d52(test 204·build 통과), code-review 치명 없음. 50 해결. 후속 51(사전 테스트·낡은 문구·push·인수인계 보관). push 보류.
- 2026-10-03: 새 요청(메인 세션 전달) — 청안(cheongan) 디자인을 웹과 모바일 앱에 적용. 49 보류 조건(실제 소스 수령)이 풀렸다. pm이 소스를 재확인했으나 모바일 앱(React Native Expo)이 저장소·설계 어디에도 없고 확정 스택(PWA 웹앱)과 충돌해 분배 전 멈춤. 설계 호출·문서 변경 없음. 확인 항목 52.
- 2026-10-04: 새 요청(메인 세션 전달, 계획 사용자 승인) — 공지 전체 수집·10분 주기 즉시 갱신·공지 화면 시안(별표·본문 이미지 배지·첨부 링크). 사용자 결정 5건을 결정 문서 2건에 기록, 설계 6종을 승인된 설계에서 뺌(16차). 설계 database → backend → frontend draft. 확인 항목 55.
- 2026-10-04: 55 사용자 결정·승인(메인 세션 전달) 반영 → 승인된 설계 17차 → 구현 database 6b89b53·backend 46c7ba1·frontend c8db497, code-review 재위임 1회(b714fa1·221d019) 후 통과. test 276·build 통과. 운영 적용·배포·백필·잡 등록·push 미실행(사용자 승인 대기, 55(t)). 55(s) 설계 변경 필요로 backend-api를 뺌(18차).

### 설계 문서

5종 모두 확인 항목 43 반영본으로 재승인(2026-09-29, user, "승인된 설계" 10차).

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
    - 갱신(2026-10-04, 메인 세션 조사): 현재 운영 주소 `https://web-beta-smoky-16.vercel.app/api/jobs/collect`에 GET하면 Vercel 로그인 페이지가 아니라 앱의 405(POST 전용 라우트)가 온다. 운영 주소는 보호에 막히지 않는 것으로 보인다. 최종 확인은 pg_cron·pg_net 설치 후 실제 POST 1회(55-e). 막히면 `x-vercel-protection-bypass` 헤더를 붙인다.
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
    - 재승인(2026-09-29, user, AskUserQuestion, 메인 세션 전달):
      - (a) 허용: 이름이 든 기억 문장도 Gemini 임베딩으로 보낸다. 기준은 DeepSeek와 같고 연락처·주민번호는 계속 `maskPii`로 가린다. [[anyang-ai-models-data-transfer]] 예외 행에 반영.
      - (b) 이번에 함께 고친다: 스트림 도중 오류·중단이 나도 받은 데까지 assistant 답변을 저장한다. 사용자가 직접 취소한 답변도 중간까지 저장되는 것을 수용. 설계 문서에 없어 backend가 구현 전에 [[anyang-backend-api]] 3-3-2절 근처에 한 단락 추가하고, 이번 승인 범위로 본다.
      - (c) 설계 5종 승인: 위 제안값 전부 확정(최근 5 + 유사 5 최대 10개, 중복 임계 0.92, 문구 2건, 스키마 변경 없음). 승인일 2026-09-29, 승인자 user.
      - 구현(2026-09-29): backend 236d410(기억 주입 최근 5+유사 5, 매 답변 `extractPreferences`, 0.92 중복 갱신, 추출 프롬프트, 부분 답변 저장, 단위 테스트; npm test 193개·build 통과). frontend 문구(memory 안내·처리방침)는 npm test 174개 통과, **build 미실행·미커밋** — 포트 3100 dev 서버(node PID 6148)가 떠 있어 `.next` 충돌 우려로 멈춤(확인 항목 44). code-review: 치명·재위임 없음, 경미 2건(pm 결정 문서 미커밋 → 이번 문서 커밋에 포함, 236d410이 코드와 설계 문서 43-b 단락을 한 커밋에 담음 — 참고만).
      - 상태: backend 완료. frontend build·커밋 뒤 43을 해결로 닫는다.
      - `anyang-database-schema`는 draft 단계에서도 frontmatter `status: active`로 남아 있었다(database가 스키마 변경이 없어 그대로 둠). 이번 승인으로 active가 맞는 상태가 되어 따로 고치지 않는다. database는 스키마 변경이 없어 구현 단계에서 호출하지 않는다.
44. **사용자 결정 필요(2026-09-29, 43 구현 중 frontend 제기)**: 포트 3100에 dev 서버(node PID 6148)가 떠 있어 frontend가 `npm run build`를 실행하지 않고 멈췄다. 미커밋 5개 파일(`web/app/(tabs)/settings/memory/memory-client.tsx`, `web/app/privacy-policy/page.tsx`, `web/test/consent-privacy-wording.test.ts`, frontend-screens·frontend-tasks 설계 문서). 선택지: (a) 사용자·메인 세션이 dev 서버를 멈춘 뒤 pm 재호출 → frontend build·커밋, (b) 메인 세션이 build를 직접 확인. 참고: backend는 같은 시각대에 build를 실행해 통과했다고 보고했다(dev 서버와 동시 실행 여부는 모름).
45. **사용자 결정 필요(2026-09-29, backend·git-manager 보고)**: 원격 대비 로컬 커밋이 5개를 넘었다(236d410 시점 6개, 이번 문서 커밋으로 더 늘어남). push 여부 확인 필요. 승인 전 push 금지.
    - 보류(2026-10-03, user, 메인 세션 전달): "나중에" — 지금 push하지 않는다(7030300 시점 로컬 5커밋 앞섬).
46. **설계 변경(2026-10-03, 새 요청 — Jev 도입 제안: `extractPreferences` 앞단 게이트)**: 메인 세션 요청. 토큰 비용 절감을 위해 `/api/chat`의 `extractPreferences`(매 답변 실행, 43) 직전에 Jev Noul 게이트를 둔다. "사용자 메시지에 본인 사실(선호·상황·이름·호칭)이 있는가" 확률이 임계값 미만이면 DeepSeek 추출을 건너뛴다. Jev 실패·키 없음은 기존대로 추출(fail-open). LLM 호출 6가지 중 대체 가능한 것은 이것 하나(메인 세션 Explore 조사). 2026-09-28 Jev 제안(27·33) 취소와는 별개 요청.
    - 진행: `anyang-backend-api`·`anyang-backend-tasks`를 승인된 설계에서 뺐다(11차). backend만 설계 draft(database·frontend 변경 없음). 재승인 뒤 backend만 구현.
    - 미해결 질문:
      - (a) 사용자 메시지가 TypeSafe(미국)로 새로 전송된다. [[anyang-ai-models-data-transfer]]와 `/privacy-policy` 갱신이 필요한지, 필요하면 이번 재승인에 함께 넣을지(넣으면 frontend 설계도 필요) 따로 할지.
      - (b) 임계값 제안 0.2(미확정)를 그대로 확정할지, `TYPESAFE_API_KEY` 준비 후 대표 입력 3종(인사·이름·선호) 측정 뒤 정할지.
      - (c) Jev 입력에 사용자 메시지만 보낼지, 기존 기억 요약도 함께 보낼지(정확도 향상 가능, 입력·전송 범위 증가).
      - (d) 게이트 판정 로그를 `console`로만 남길지, `api_usage_logs`에 남길지(후자는 database 설계 필요).
      - (e) backend가 [[anyang-backend-tasks]] 6-1에 "46-a 해결 후 착수" 선행 조건을 넣었다. 유지할지.
    - 설계 draft 완료(2026-10-03, backend): [[anyang-backend-api]] 3-3-3절 "Jev 게이트"·테스트 방법, [[anyang-backend-tasks]] 6-1, glossary "Jev 게이트" 용어 추가. 제안값(미확정): 임계값 0.2, 타임아웃 2초, fail-open(오류·타임아웃·키 없음·응답 이상), 전송은 `maskPii` 후 사용자 메시지 1건만, 호출은 HTTP(새 의존성 회피). 위치 `web/app/api/chat/route.ts` `extractAndStorePreference`(85행) 안 `extractPreferences`(96행) 직전. 재승인 대기.
    - 47 재검증 결과 관련(2026-10-03, code-review): 추출 호출과 채팅 호출이 `api_usage_logs`에서 같은 operation `chat`이고(`web/lib/deepseek.ts:55`) 토큰도 null이다. 46의 "실제 비율은 `api_usage_logs`로 확인" 전제는 지금 측정할 수 없다. 46 재승인 전에 (d)와 함께 결정 필요.
    - **해결됨: 보류(2026-10-03, user, 메인 세션 전달) — 추후 운영 서비스(`web/`)에 Jev를 적용할 때 재개.** 지금은 운영 서비스에 Jev를 넣지 않는다. 개발 워크플로우용 `scripts/jev.py`는 이미 쓰고 있어 이 결정과 무관하다. 위 (a)~(e)와 47 관련 질문은 재개 때까지 묻지 않는다. 구현하지 않으며 46 draft(3-3-3절·6-1)는 재승인 대상에서 뺀다. 설계 문서의 보류 표기는 소유자 backend에 맡긴다.
44-갱신(2026-10-03, frontend 확인): 43 frontend 문구는 커밋 58af91a에 들어갔다(memory-client·privacy-policy·문구 테스트·설계 2종, 5개 파일). `web/`에 미커밋 변경 없음. build 통과 기록은 없다(커밋 메시지에 없음, 이번 검수에서 미실행). 남은 것은 build 확인뿐.
47. **overview 문서·코드 재검증(2026-10-03, 사용자 요청)**: 메인 세션 1차 조사(Explore)를 소유 에이전트가 다시 확인(database → backend → frontend, code-review 교차 검수). 코드·설계 문서 변경 없음. 바꾼 것은 채팅요청흐름 다이어그램(json·html, backend가 archify로 재생성)뿐이다. **frontend 구현은 사용자 지시로 보류**: 팀원에게서 앱 디자인 기반 소스코드를 받아 적용한 뒤 웹·앱을 함께 구현할 때 설계 단계부터 다시 시작한다. 아래 frontend 항목은 기록만 하고 지금 고치지 않는다.
    - 확인됨: 매 답변 추출(6의 배수 게이트 없음, `web/app/api/chat/route.ts:168-174`), 기억 주입 최근 5 + 유사 5·최대 10·중복 제거·최근 우선(`:46-80`), 거리 `< 0.08`이면 UPDATE 아니면 INSERT(`:85-128`), 부분 답변 저장(43-b). 그 밖에 전체구성도·수집알림파이프라인의 수치(768차원, HNSW, top-5, 1500자, 0.75, 5분 창, 04:00, 2초, 15분 5회, icn1, maxDuration 300, 0019 RLS)는 코드와 일치.
    - (a) **선호 정정 정책 없음(설계 범위 밖, 설계 변경 필요)**: 모순되는 새 사실은 기존 행을 고치지 않고 추가된다. backend 실측(Gemini 임베딩, 손으로 쓴 예시 문장) 거리: "취업 준비 중"↔"회사에 다닌다" 0.16, "4학년 재학"↔"졸업" 0.16, 이름 홍길동↔김철수 0.18 → 모두 INSERT, 둘 다 프롬프트에 주입. 같은 뜻 문장(0.017)만 UPDATE. 추출 프롬프트에 정정·대체 지시가 없고(`web/lib/deepseek.ts:67-70`), 삭제는 사용자 수동 삭제와 탈퇴뿐. 즉 "대화가 쌓이면 AI가 잘못된 기억을 스스로 고친다"는 현재 설계·구현 모두 아니다. 선택지(backend 제시): (i) 그대로 두고 문서에 "중복 병합만, 정정은 수동 삭제" 명시, (ii) 추출 시 기존 기억 id를 넘겨 "대체" 쌍을 출력하게 함, (iii) 임계 완화 — 모순 거리 0.14~0.18은 병합하기에 멀어 안전하지 않음(backend 의견), (iv) 최신 우선·만료. 사용자 결정 필요. (ii)·(iv)는 backend(필요 시 database) 설계 draft → 재승인.
    - (b) **기억 화면·탈퇴 화면 진입 경로 없음(설계 변경 필요, frontend 보류 대상)**: `/settings/memory` 링크가 앱 전체에 0건, 하단 "설정" 탭은 `/settings/notifications`로만 감(`web/app/(tabs)/bottom-nav.tsx:6-10`). `/settings/account`는 재동의·정지 화면에서만, 처리방침은 탭 화면에 링크 없음. [[anyang-frontend-screens]]에 설정 하위 구조 정의가 없다. 처리방침 문장 "설정 메뉴의 'AI가 기억하는 내 정보'"와 모순되고, (a)의 유일한 정정 수단(수동 삭제)에도 일반 사용자가 닿지 못한다. 팀원 디자인 적용 때 반영할지 결정 필요.
    - (c) **frontend 구현 버그(code-review, 구현 수정, 보류)**: ① `chat-client.tsx:46,72-93` 스트림·fetch 예외 처리 없음 → 네트워크 오류 시 `sending` 고착, 새로고침 전까지 전송 불가(주요). ② 추천 목록 "아직 대화 기록이 없어 최신 공지 순으로 보여드려요"가 [[anyang-frontend-screens]] 4절에 있는데 코드에 없음, 코드 주석(`notices-list.tsx:9-12`)이 설계와 반대로 "미확정"이라 적음. ③ 공지 목록·상세에 `posted_at` 미표시(정의서 B-2 "제목·발췌·게시일"과 불일치). ④ `manifest.ts` icons 빈 배열 — 홈 화면 추가가 실제로 되는지 확인 못 함. ⑤ 이메일 가입 폼 체크박스에 가림 안내 없음(경미). 팀원 소스 적용 때 함께 다룰지 결정 필요.
    - (d) **POLICY_VERSION**: 43에서 처리방침에 이름·호칭 기억 고지를 추가했지만 `web/lib/consent.ts:3`은 `"2026-09-27"` 그대로. 18번(개정 시 재동의)을 따를지 41(e)처럼 예외로 둘지 기록이 없다. 사용자 결정 필요.
    - (e) **인증 시도 경계**: 코드 `count >= 5` → 5회 실패 후 6번째 시도 차단(올바른 비밀번호여도). [[anyang-database-schema]] 132-133행·[[anyang-backend-api]] 271-282행·서비스-소개 "5번 넘게"는 "초과" 표현, backend-api 1102-1103행 테스트 명세는 코드와 같다. 코드가 의도대로라면 문서 표현만 정정. 사용자 확인 필요.
    - (f) **설계 문서 정정 대상(잠금 해제 필요)**: [[anyang-database-schema]] 333-336·352행 0.92/0.08에 "(제안, 미확정)"과 "backend가 샘플로 조정" 문구 잔존(43(c)에서 확정됨), 359-365행 "다음 추출 때 합쳐질 가능성이 크다"는 부정확(UPDATE는 가장 가까운 한 행만 덮어써 중복 행은 남음), 764행 "19개 테이블 생성 마이그레이션"(실제 테이블 16개), 0016 `collect_runs.triggered_by on delete set null` 누락. [[anyang-backend-api]] 3-3-2절 "클라이언트 중단 시 캡처 branch도 끊길 수 있다"는 Node 22 시뮬레이션과 반대(취소해도 끝까지 읽혀 전체 답변이 저장됨, Vercel 실제 런타임은 확인 못 함), "104행"은 실제 168행. backend-api는 46 draft 중이라 46 재승인 때 함께 고칠지 결정 필요. database-schema는 승인된 설계라 고치려면 빼고 재승인.
    - (g) **코드 주석·로그(경미, 구현 수정)**: `route.ts:226-227` 주석 "가공 전 원본 메시지 임베딩"인데 실제는 `maskedMessage`. `web/db/jobs/UNAPPLIED_cleanup-auth-attempts.sql` 헤더 "1일 보존은 (미확정) 제안"이 낡음(32에서 확정). 다음 backend·database 구현 때 함께.
    - (h) **잠재 위험(설계 범위 밖)**: `user_preferences.source_conversation_id` FK에 on delete 규칙 없음(NO ACTION). 탈퇴 cascade는 문장 끝 검사라 문제없을 것으로 추론(실DB 미확인). 대화 단건 삭제 기능을 나중에 만들면 FK 위반. 그때 database 설계에 포함.
    - (i) **overview 문서 낡은 서술(shared 소유, 사용자가 "최신화" 요청할 때만 갱신)**: 프로젝트-정의서 "관심사를 문장으로 요약"(실제는 매 답변 사실 추출·기억 주입·이름 기억), 정의서 11절·서비스-소개 "이름은 외부 AI로 보내지 않음"(43 예외 누락), 정의서·서비스-소개의 "국외 이전/해외 전송 동의" 표현(화면은 41 이후 "AI 활용 동의"), 정의서 "동의 기록 1년 보관 후 삭제"(정리 잡 미등록), 전체구성도 "17 tables"(앱 테이블 16 + schema_migrations — database는 일치, code-review는 16개가 맞다고 봄, 표기 기준 결정 필요), 수집알림파이프라인 임베딩 입력 "공고 원문"(실제 제목+본문), "15개씩 배치"(실행당 공고 15건, Gemini는 텍스트당 1회 호출), 채팅요청흐름 `search` 메시지 순서(선호 벡터 결합은 기억 조회보다 먼저, 경미), 서비스-소개 "매일 04:00·5분마다"를 가동 중인 사실처럼 쓰는지(pg_cron 미등록). 이번에 고칠지, 다음 "최신화" 요청 때 할지 결정 필요.
    - (j) **부산물·도구**: archify가 채팅요청흐름 visual-check 파일 6개(png 4·html·json)를 미추적으로 남겼다(수집알림파이프라인의 같은 종류 파일은 추적 중). 커밋할지 지울지(삭제는 승인 필요) 결정 필요. archify 설치본 2.17.0-dev.1, 최신 3.0.1 — 업데이트 여부 사용자 결정.
    - 참고: backend가 (a) 측정을 위해 손으로 쓴 예시 문장 12개를 Gemini 임베딩 API로 보냈다(실제 사용자 데이터 아님, 키는 출력·저장 안 함).
    - **(a) 결정됨(2026-10-03, user, 메인 세션 전달): (ii) 추출 시 대체 방식.** 확인 대기에서 내린다. 후속 설계는 48. (iii) 임계 완화·(iv) 만료는 채택하지 않는다.
48. **설계 변경(2026-10-03, 47-a 결정 — 모순 선호 즉시 정정)**: 추출 시 사용자의 기존 기억 목록(id 포함)을 LLM에 함께 보여 주고, 새 사실이 기존 기억과 모순되면 그 id의 행을 대체(UPDATE)한다. 모순이 아니고 거리 0.08 미만이면 기존대로 갱신, 둘 다 아니면 INSERT. 목록 개수(전체 vs 최근 N), 모순 판단 호출 방식(같은 추출 호출 통합 vs 별도 호출), 토큰·비용 영향은 설계 문서에 적고 애매한 값은 (미확정).
    - 진행: `anyang-database-schema`를 승인된 설계에서 뺐다(12차) — user_preferences 갱신 정책(0.92 규칙) 서술이 바뀐다. backend-api·backend-tasks는 46으로 이미 빠져 있다. 설계 database → backend draft 후 사용자 재승인. 46(Jev 게이트) draft와 같은 문서·같은 함수라 함께 재승인 대상이었으나, 46이 보류(2026-10-03)되어 48만 재승인 대상이다.
    - 설계 draft 완료(2026-10-03): database — [[anyang-database-schema]] user_preferences 절(세 경로 모순 대체 → 유사 갱신 → INSERT, 스키마·인덱스·마이그레이션 변경 없음, 대체 UPDATE는 `where id and user_id`, 47-f 중 이 절의 0.92 낡은 문구·"합쳐질 가능성" 서술 정정, status draft). backend — [[anyang-backend-api]] 3-3-4절·테스트 10건, [[anyang-backend-tasks]] 6-2(46 내용 불변). 핵심: 기억 주입용 목록(최근 5 + 유사 5, 최대 10) 재사용, 같은 추출 호출에 통합(추가 호출 0), 프롬프트는 uuid 대신 순번, 출력 `[{"fact", "replaces": 순번|null}]`, 불확실하면 null 지시. 토큰 추정 입력 +200~400/회·출력 +15~50/사실(추정, 근거: 프롬프트 증가 약 200자·한국어 1~2토큰/자 가정), 비용 금액은 측정 불가. 외부 전송 범위 증가 없음(기억 문장은 이미 DeepSeek로 감).
    - 미확정 값·질문(재승인 때 결정):
      - (a) 목록 크기: 주입용 10개 재사용(제안) vs 확대. 목록 밖 기억은 정정되지 않고 공존할 수 있다.
      - (b) 호출 방식: 같은 추출 호출 통합(제안) vs 별도 호출.
      - (c) 순번 표기와 필드명 `fact`/`replaces`.
      - (d) 잘못된 `replaces`(범위 밖·형식 이상)는 null로 바꾸고 문장은 유지(제안).
      - (e) 대체 UPDATE 0행(사이에 삭제 등)이면 유사 갱신 → INSERT로 넘김(database·backend 제안).
      - (f) ~~덮어쓴 이전 문장 이력 미보관(제안)~~ → **결정됨(2026-10-03, user, 메인 세션 전달): 이력 남김.** 모순으로 대체되는 기억은 지우지 않고 별도 컬럼(예: `superseded_at` 타임스탬프 — 이름·구조는 database 설계)으로 표시해 잘못된 대체를 되돌릴 수 있게 한다. database 스키마 draft에 컬럼 추가, backend 대체·조회 쿼리에 반영. 최종 승인 전이라 구현 없음.
      - (g) 같은 순번 중복 지정 시 첫 문장만 대체(제안).
      - (h) 프롬프트 문구 확정 전에 가짜 문장 쌍 약 12개(모순 6·비모순 6)로 DeepSeek 수동 확인을 할지.
      - (i) 46 게이트 거짓 음성이면 그 턴의 정정도 빠지는 것을 수용할지. — 46 보류로 지금은 묻지 않는다(46 재개 때 다시 확인).
    - (f) 반영 draft 완료(2026-10-03, database → backend). database [[anyang-database-schema]]: 제안 구조 "안 1" — 옛 행에 `superseded_at timestamptz`·`superseded_by uuid`(자기 참조 FK, on delete set null) + 체크 제약을 찍고 새 문장은 새 행 INSERT(되돌리기는 표시 해제 UPDATE 1회), 마이그레이션 0020(`0020_user_preferences_superseded`, up은 컬럼 2개·제약, down은 대체된 행 있으면 중단 가드), 인덱스 추가 없음, 활성 조건 `superseded_at is null`을 user_preferences 조회 전부에 추가, 되돌리기 운영 SQL. glossary "대체된 선호" 추가. 대체 CTE·0020은 실행 검증 못 함(로컬 DB·MCP 없음). backend [[anyang-backend-api]] 3-3-4절(저장 순서·반환 id = 새 행·활성 조건 표·토큰 영향 없음·DB 대체 1회당 행 1개 증가), 2-1·2-3·3절 2-a·3-3·7절에 활성 조건, 테스트 (1)(1-a)(1-b)(11)(12), [[anyang-backend-tasks]] 6-2(선행: database 재승인 → 0020 적용 → 6번, 6-1 비의존). 46 보류 표기(3-3-3절·테스트).
    - (f) 후속 미확정·질문:
      - (f-1) 구조: 안 1(옛 행 표시 + 새 행 INSERT, 제안) vs 안 2a(같은 행 UPDATE + 직전 문장·임베딩 컬럼 보관, 이력 1단계) vs 안 2b(이력 테이블). 사용자 표현 "별도 컬럼으로 마킹한 뒤 UPDATE"가 어느 쪽인지 단정 못 함. 안 1이면 대체 시 행 id가 바뀐다(기억 화면의 옛 id로 PUT·DELETE하면 404).
      - (f-2) 이력 범위: 모순 대체만 이력, 유사 갱신·사용자 직접 수정(PUT)은 제자리 UPDATE(제안).
      - (f-3) 대체된 행 보존 기간·정리 잡(등록은 되돌릴 수 없는 삭제라 별도 승인).
      - (f-4) 사용자가 기억을 삭제할 때 그 행이 대체했던 옛 판본도 함께 삭제(제안, 재귀).
      - (f-5) 기억 화면에 대체된 기억 표시·되돌리기 UI/API — 이번 범위 밖(제안). 되돌리기는 운영 SQL만.
      - (f-6) 되돌릴 때 새 행 처리·`updated_at`·연쇄 되돌리기 규칙.
      - (f-7) 0020 down 가드 유지 여부.
      - (f-8, 아래 결정 참고) 처리방침·기억 화면 문구("삭제하면 사라진다" 등)·탈퇴 안내와 이력 보관의 정합성, 기억 화면이 id 변경 뒤 목록을 다시 불러오는지 — frontend 확인 필요(frontend 보류 중이라 이번에 호출 안 함). 보이지 않는 과거 개인정보가 늘어나는 점을 [[anyang-ai-models-data-transfer]]·처리방침에 어떻게 적을지.
    - **최종 결정(2026-10-03, user, 메인 세션 전달) — 48 확정**:
      - (f-1) 구조 **안 2a**: 같은 행을 그대로 UPDATE하고 직전 문장 1단계만 별도 컬럼(예: `previous_fact` text)에 보관. 기억 id 불변. 안 1·안 2b 미채택, `superseded_at`/`superseded_by` 대신 보관 컬럼 하나로 단순화.
      - (a) 주입용 10개 재사용, (b) 기존 추출 호출에 통합, (c) 순번 표기·`fact`/`replaces`, (d) 잘못된 `replaces`는 null, 문장 유지, (e) 대체 대상 없으면 유사 갱신 → INSERT, (g) 중복 순번은 첫 문장만 대체, (h) 가짜 문장 쌍으로 DeepSeek 사전 테스트 진행 허용.
      - (f-2) 이력은 모순 대체만, 유사 갱신·사용자 수정은 제자리 덮어씀. (f-3) 별도 정리 잡 없음(1단계 보관이라 자동으로 최신만 남음). (f-4) 기억 삭제 시 보관 문장도 함께 삭제(같은 행이라 자연히). (f-5) 이전 문장 표시·되돌리기 UI 없음, 되돌리기는 운영자 SQL. (f-6) 되돌리기 = 현재 문장과 직전 문장 swap, 2단계 이상 이전 판본 유실 수용. (f-7) 0020 down 안전장치 없음.
      - (f-8) **보류**: 처리방침·기억 화면 문구 정합성은 frontend 재개(팀원 소스 적용) 때 확인.
      - (i)·46 Jev 게이트는 보류 유지.
      - 진행: database → backend 설계 최종 반영 후 "승인된 설계"에 기록(13차), 구현 database(0020 적용) → backend, 테스트 후 커밋. push 보류.
      - 설계 최종 반영·승인 기록 완료(2026-10-03): 설계 커밋 8f0e665. 확정 컬럼 `user_preferences.previous_fact text`(null 허용, 직전 임베딩 미보관), 마이그레이션 `0020_user_preferences_previous_fact`.
      - **구현 중단(2026-10-03, database)**: 0020 up/down 파일 작성, database-schema `status: active`·(미확정) 1곳 제거까지 했으나 **미커밋**. 운영 적용 못 함 — database 에이전트 세션에 Supabase MCP 도구가 노출되지 않음("No such tool available"). 운영 적용, `schema_migrations` 기록, 점검 SQL 2개, 컬럼 확인, SET 우변(갱신 전 값) rollback 검증, npm test·build, 커밋 모두 미실행. backend 구현은 [[anyang-backend-tasks]] 6-2 선행 조건(0020 적용 먼저)에 따라 시작하지 않음. 확인 항목 50.
      - **구현 완료(2026-10-03)**: database — MCP 재연결 후 0020 운영 적용(단일 트랜잭션, `schema_migrations` 기록), 점검 SQL 2개 0행, 설계 테스트 ①②④⑦⑧ 롤백 검증 통과, 커밋 226e4f6. `get_advisors`는 도구 없어 미실행. backend — `extractPreferences`가 `{fact, replaces}[]` 반환, 대체 UPDATE(`where id and user_id`, 옛 문장 → `previous_fact`), 0행이면 유사 갱신 → INSERT, 커밋 21b9d52(npm test 204개·tsc·build 통과, 3100 포트 확인 못 함). 설계 3종 status active. code-review: 치명·주요 없음(user_id 조건·`previous_fact` 비노출·PUT 불변·replaces 검증·가림·46 미구현 확인). 경미·후속은 확인 항목 51.
50. **사용자·메인 세션 조치 필요(2026-10-03, 48 구현)**: database 서브에이전트 세션에서 Supabase MCP 도구가 보이지 않는다(에이전트 정의에는 5개가 있음). 선택지: (a) 메인 세션에서 MCP 연결을 확인한 뒤 pm 재호출 → database가 0020 적용·검증·커밋 → backend 구현 → code-review, (b) 메인 세션이 MCP로 0020 up(`web/db/migrations/0020_user_preferences_previous_fact.up.sql`)을 단일 트랜잭션으로 적용하고 `schema_migrations`에 기록·점검 SQL 2개 실행 후 pm 재호출(database는 검증·커밋만). 미커밋 파일: `web/db/migrations/0020_user_preferences_previous_fact.up.sql`·`.down.sql`, `AI-Sessions/wiki/design/anyang-database-schema.md`(status·표시만). 0020 down은 운영에서 실행하지 않는다.
    - 해결(2026-10-03): 선택지 (a)로 진행. MCP 재연결 후 database가 적용·검증·커밋(226e4f6). 48 항목 참고.
51. **사용자 확인 필요(2026-10-03, 48 구현 후속, 차단 아님)**:
    - (a) DeepSeek 사전 테스트(확정 (h), "키가 있을 때만")는 실행하지 않았다. 프롬프트는 설계 초안 문구 그대로라 모순 판정 정확도는 미측정. `DEEPSEEK_API_KEY`로 backend에 실행을 맡길지.
    - (b) [[anyang-backend-api]] 3-3-4절 제목·본문에 "재승인 대기", "초안", "이 설계 단계에서는 코드를 쓰지 않음" 같은 낡은 문구가 남음. 설계 잠금 대상이라 다음 재승인 때 backend가 정리(26번과 같은 성격).
    - (c) push: 로컬 커밋이 origin보다 11개 이상 앞선다(규칙상 5개 이상이면 확인). 계속 보류할지.
    - (d) 인수인계 `2026-10-03_anyang-mcp-blocked-handoff`는 내용이 이 문서로 통합됐다. `conversations/archive/`로 옮길지.
    - **결정(2026-10-03, user, 메인 세션 전달) — 부분 완료**: (a) 진행 — backend가 가짜 문장 12개(모순 6·비모순 6)로 `extractPreferences` 정확도를 잰다. 결과를 보고 다음 단계(남은 설계 변경 여부, 없으면 1차 구현 완료 선언)를 정한다. (b) 다음 설계 변경 때 함께 정리. (c) push 보류 유지(로컬 커밋 12개). (d) archive 대신 삭제 — 메인 세션이 2026-10-03 삭제. 이 파일은 7542d51로 커밋된 추적 파일이라 삭제 커밋이 남아 있다(작업 트리 `D` 상태).
    - (d) 삭제 커밋: git-manager에게 맡겼다(이 문서·log.md 변경과 함께).
    - (a) **측정 결과(2026-10-03, backend, 코드·설계 변경 없음)**: 가짜 사례 12개(모순 6·비모순 6)로 실제 `extractPreferences`를 두 번 돌렸다. 1회차 11/12(모순 6/6, 비모순 5/6), 2회차 12/12. 모순 사례는 두 번 모두 지목한 순번이 맞았다. 오판 1건(1회차만): 기존 "취업준비 중이다"에 대화 "IT 쪽 일자리를 알아보고 있어요"를 보충이 아닌 대체(`replaces: 1`)로 판정해 기존 기억이 `previous_fact`로 밀려남. 2회차에는 같은 입력을 대체로 보지 않아 응답이 흔들린다. 호출 24회, 입력 6,966·출력 438 토큰(응답 usage 실측). `api_usage_logs`는 mock 처리해 운영 DB 기록 없음. 표본이 작아 오판율 추정은 불확실하다.
    - **사용자 결정 필요**: (a-1) 이 결과로 1차 구현 완료를 선언할지, (a-2) 프롬프트에 "같은 주제를 구체화·보충하면 모순이 아니다" 예시를 넣을지(backend 제안, 설계 변경 → backend-api·backend-tasks를 승인된 설계에서 빼고 재승인), (a-3) 보충 사례를 늘려 다시 측정할지.
49. **설계 조사(2026-10-03, 사용자 요청 — 팀원 디자인 소스 cheongan 적용 가능성)**: 위치 `C:\Users\whwlg\Downloads\cheongan\`(design-system: Tailwind v4 + W3C 토큰, react-prototype: React 19 + Vite 해시라우터). `web/`은 Next.js 16 + React 19 + 순수 CSS. frontend가 재검증하고 Tailwind v4 도입 영향, `globals.css`와의 충돌·공존, 화면 매핑표를 새 설계 문서 draft로 정리한다. **코드·설치·파일 복사 금지, 조사·문서만**(47 frontend 구현 보류 유지). 47(b)·(c) 처리 시점 판단의 근거로 쓴다.
    - 조사 draft 완료(2026-10-03, frontend): [[anyang-cheongan-design-adoption]]. 코드·설치 변경 없음. 기술적으로 적용 가능(React 19 동일, Next 16.3.6, Tailwind v4는 `@tailwindcss/postcss` 필요 — 프로토타입의 `@tailwindcss/vite`는 못 씀). 충돌 있음(설치된 tailwindcss 4.3.3 코드와 캐스케이드 규칙으로 추론, 브라우저 미확인): 레이어 밖 `globals.css`의 전역 `button`·`h1`·`a`·`fieldset` 규칙이 Tailwind 유틸리티를 이김, `--border-strong` 이름 같고 의미 다름(색 vs 2px), 색 체계 이중화. 공존안 A 전면 교체/B 점진/C preflight 끄기/D globals.css를 `@layer components`로 이동 — 제안 D 후 B(미확정). 화면: 대화 `/chat`·공지 목록 `/notices` 기존 API로 충분, 공지 상세는 `image_count` 없음(backend·database 설계 변경 필요), 알림은 구독 조회 GET 없음(backend 설계 변경 필요), 내 정보는 하단 탭 3→4개(frontend-screens 설계 변경 필요). 47(b)는 "내 정보" 탭으로 해결, 47(c) ①②③은 함께 처리 가능, ④⑤는 독립.
    - 미확정·질문: (a) 공존안, (b) 본문 글꼴·로딩 방식, (c) 탭 4개, (d) 안양 비서에만 있는 화면(로그인·동의·온보딩·정지·처리방침·관리자 4종)에 디자인을 어디까지 입힐지, (e) `image_count`·구독 조회 GET 추가 여부, (f) 되돌리기 Toast 구현 방식, (g) 토큰 폴더 위치, 내 정보 고정 문구 파일 위치, (h) 받은 폴더에 없는 자료: `Icon.tsx`·`tokens.json`·`build-tokens.mjs` 확인 못 함, 「청안 화면 기능 정의서 v0」 못 찾음 — 팀원에게 받을지. (i) 적용을 진행한다면 frontend-screens·frontend-tasks를 승인된 설계에서 빼고 backend(필요 시 database) → frontend 설계부터 한다.
    - **보류(2026-10-03, user, 메인 세션 전달)**: 팀원에게 실제 소스코드를 받을 때까지 진행하지 않는다. Tailwind 설치·API 추가·화면 이전 등 설계 변경 모두 보류. [[anyang-cheongan-design-adoption]] draft는 그대로 둔다. 위 미확정 (a)~(i)도 그때까지 보류.
    - 역링크 미완: [[anyang-frontend-screens]]·[[anyang-frontend-tasks]](승인 잠금, frontend 소유)·[[anyang-backend-api]](backend 소유)에서 새 문서로 가는 링크 없음(lint WARN). 다음 해당 문서 설계 수정 때 넣는다.
    - 보류 해제(2026-10-03, 메인 세션 전달 새 요청): 적용 진행. 같은 폴더에 이번에는 `Icon.tsx`(직접 그린 선 아이콘 15개, 외부 라이브러리 import 없음)·`tokens.json`·`build-tokens.mjs`·`samples/anyang-youth-notices.json`이 있다(pm 확인). 「청안 화면 기능 정의서 v0」는 여전히 폴더에 없다(README가 `../docs/`와 claude.ai 링크를 가리키지만 `docs/` 폴더 없음). 진행 전 질문은 52.

52. **사용자 결정 필요(2026-10-03, 새 요청 — 청안 디자인 웹·앱 적용)**: pm이 분배 전에 멈춤. 설계 호출·설계 문서 변경 없음, "승인된 설계" 그대로.
    - (a) **모바일 앱 범위(차단)**: 요청은 "앱: React Native Expo(준비 단계)"에도 적용하라고 하지만, 저장소에 Expo·React Native 프로젝트가 없고(`package.json` 검색 0건) wiki에도 모바일 앱 결정이 없다. 확정 스택은 "Next.js 풀스택 PWA 웹앱"([[anyang-stack-database]]). 선택지: ① 이번에는 웹(PWA)만 — 청안 프로토타입 자체가 390폭 모바일 웹 시안이라 PWA로 휴대폰 화면을 그대로 낼 수 있다(권장), ② Expo 앱을 새로 만든다 — 스택 결정 변경(결정 문서 갱신), 앱 폴더 위치, 인증(Auth.js 세션 쿠키를 앱에서 쓸 수 없어 토큰 방식 API 필요 → backend 설계 변경), 푸시(Web Push 대신 Expo 푸시 → backend·database 설계 변경), 스토어 배포 계정 결정이 따라온다, ③ 웹 먼저, 앱은 별도 요청으로.
    - (b) **"직접 복사 금지"의 범위**: 청안 README의 이행 방법은 컴포넌트 복사다. 토큰 생성물(`tokens.css`·`tailwind.css`·`tokens.ts`)과 원본 `tokens.json`·`build-tokens.mjs`는 그대로 가져와도 되는지(토큰은 값의 원본이라 다시 쓰면 어긋남), 컴포넌트만 새로 작성하는지.
    - (c) 49의 미확정 (a)~(g) — 설계 방향을 정하는 값이라 답이 필요하다. 권장안을 함께 적는다(전부 제안):
      - 공존안: D(`globals.css`를 `@layer components`로) 후 B(화면 단위 점진 이행)
      - 글꼴: 토큰대로 Hahmlet·IBM Plex Sans KR·IBM Plex Mono, `next/font/google` 로딩(본문을 Pretendard로 할지는 팀원 정의서의 미확정 항목 5번)
      - 하단 탭: 청안대로 4개(공지·대화·알림·내 정보). 47(b) 기억 화면 진입 경로가 함께 해결된다
      - 청안 시안이 없는 화면(로그인·동의·온보딩·정지·처리방침·대화 기록·관리자 4종): 토큰·공통 컴포넌트만 입힘, 관리자는 25번처럼 가독성·일관성만
      - 공지 상세 이미지 배지(`image_count`)·알림 "받는 기기" 목록(구독 조회 GET): 이번엔 해당 UI를 빼고 기존 API만 쓴다(backend·database 설계 변경 없음 → 요청의 "기존 API 유지"와 맞음). 넣는다면 backend(필요 시 database) 설계부터
      - 관심사 삭제 되돌리기: 클라이언트에서 삭제 요청을 5초 늦춤(API 변경 없음)
      - 토큰 위치: `web/` 안(외부 폴더 import는 Turbopack 동작 확인 못 함)
    - (d) **함께 처리할지**: 47(c) frontend 버그 ①~③(어차피 다시 쓰는 파일), ④ manifest 아이콘, ⑤ 가입 폼 가림 안내, 48(f-8) 처리방침·기억 화면 문구 정합성. 권장: ①~③과 (f-8)은 포함, ④⑤는 별도.
    - (e) 「청안 화면 기능 정의서 v0」(화면별 데이터 필드) — 팀원에게 받아 `AI-Sessions/raw/`에 둘지, 없이 프로토타입 코드만 근거로 할지.
    - (f) 참고(요청 문구와 규칙 차이): 설계 문서 위치는 요청의 `wiki/projects/`가 아니라 규칙대로 `wiki/design/`·`wiki/dev-tasks/`를 쓴다. 커밋은 기능 단위로 git-manager가 하고 push는 45·51(c)대로 사용자 승인 전 보류.
    - 답을 받으면: [[anyang-frontend-screens]]·[[anyang-frontend-tasks]]를 승인된 설계에서 빼고(14차), (c)에서 API 추가를 고르면 backend 문서도 뺀다. 설계는 필요한 에이전트만 database → backend → frontend 순으로 한 번에 하나씩, [[anyang-cheongan-design-adoption]]을 갱신하거나 frontend-screens에 반영 → 사용자 재승인 → 구현(taste-skill `design-taste-frontend`) → code-review.
    - **결정(2026-10-03, 메인 세션 전달)**: (a) ① 웹(PWA)만, Expo 별도 앱 없음. (b) 청안 `tokens.json`·`tokens.css`·`tailwind.css`를 그대로 가져와 쓴다(컴포넌트는 새로 작성). 추가 요청: 390폭 시안 기반 반응형 — 모바일(390)·태블릿(768)·데스크톱(1200), 데스크톱은 사이드바.
    - 답 없음: (c) 49 미확정값, (d) 함께 처리 범위, (e) 기능 정의서. pm 판단: (c)는 위 권장안을 frontend draft에 `(미확정)` 제안으로 넣어 설계 승인 때 확정받는다. API 추가 없는 안이라 backend·database 설계 호출 없음. (d)는 이번 draft 범위에서 뺀다(답 오면 추가). (e)는 프로토타입 코드만 근거로 한다.
    - 요청 문구와 다르게 처리한 것: 요청은 새 문서 frontend-design·frontend-screens·frontend-components를 만들라고 했지만, 중복 금지 규칙으로 기존 [[anyang-frontend-screens]]·[[anyang-frontend-tasks]]·[[anyang-cheongan-design-adoption]]을 갱신한다. 요청의 "Next.js 13"은 실제 16이다.
    - 진행: frontend-screens·frontend-tasks를 승인된 설계에서 뺐다(14차). frontend 설계 draft → 사용자 재승인 → 구현.
    - **설계 draft 완료(2026-10-03, frontend)**: [[anyang-cheongan-design-adoption]](토큰 `web/design-system/`에 그대로 복사, `globals.css` `@layer components`, 옛 의미 토큰을 청안 토큰으로 재지정, `@tailwindcss/postcss`, 글꼴, 브레이크포인트, 공통 컴포넌트·`AppShell`·사이드바), [[anyang-frontend-screens]](청안 적용 화면 스펙 절, 탭 4개, 내 정보 `/settings` 신규, 시안 없는 화면 처리표), [[anyang-frontend-tasks]](작업 C1~C10, 테스트 방법 390/768/1200 확인). 설계 변경 필요 없음(기존 API만). backend·database 호출 없음.
    - **재승인 때 확인할 것(전부 제안, `(미확정)`)**: 위 (c) 권장안 전부 + 탭 순서, `/settings/memory` → `/settings` 리다이렉트, 옛 토큰 재지정표(시안 없는 화면 모습이 바뀜), `viewportFit`·`themeColor`, 데스크톱 1200·태블릿 레이아웃·사이드바 구성·최대 폭 720px(관리자 1040px), 5초 지연 삭제(화면 이탈 시 즉시 전송), 계정 탈퇴 `<dialog>`, 프로필 수정 버튼·공지 상세 출처 줄 제외, 404·알림 규칙 문구, 알림 안내 상자 "청안" 표기, 채팅 조건 줄 항목.
    - frontend 미해결 질문:
      - (g) 탭 순서: 52(c) 권장안은 공지·대화·알림·내 정보, 청안 `TabBar.tsx`는 대화·공지·알림·내 정보. draft는 프로토타입 순서.
      - (h) 시안 문구 "이름과 이메일은 보내지 않아요"는 43(이름 기억·전송 허용)과 어긋나 뺐다.
      - (i) 채팅 조건 줄: 시안은 나이대·재학재직 2개, 실제 AI에는 나이대·성별·직군·재학재직 4개가 간다. 몇 개를 보일지.
      - (j) 47(c)① 채팅 스트림 실패 표시: `chat-client.tsx`를 다시 쓰면서 고치지 않고 둘지(draft는 error prop만 두고 연결 안 함). 위 (d) 답과 함께 정한다.
      - (k) 구현 때 확인할 것: `tokens.css` `layer(base)` import, `next/font` 한국어 서브셋, 브라우저 레이어 우선순위.
      - (l) 삭제 승인: C10에서 옛 클래스와 `app/_components/bottom-nav.tsx` 삭제.
    - 역링크 필요: [[anyang-backend-api]] ← [[anyang-cheongan-design-adoption]] (backend 소유, 다음 backend 설계 수정 때).
    - **승인(2026-10-03, user, 메인 세션 전달)**: draft 전부 승인. (g) 청안 시안 순서(대화·공지·알림·내 정보), (h) 문구 제거, (i) 2개 필드(나이대·학/직), (j) 47(c)①은 범위 밖(나머지 47(c) 버그와 함께 나중에), (l) C10 삭제 승인. (d)·(e)는 범위 밖·프로토타입 근거로 그대로. 승인된 설계 15차 기록 → 구현(frontend) → code-review.
    - **구현 완료(2026-10-03)**: frontend C1~C3 `1fe7d2e`(토큰 `web/design-system/` 복사, `@tailwindcss/postcss`, `globals.css` 이행, 글꼴·viewport·manifest), C4~C9 `19b1a7b`(`(tabs)/layout.tsx`·`app-nav`·`ui/` 5개·lib 5개, 화면 전부, 내 정보 `/settings` 신규, 테스트 5파일), C10 `28862dd`(`bottom-nav.tsx`·옛 클래스 삭제). npm test 240개·build 통과. 설계 3종 active, `(미확정)` 54개 제거. 화면 확인은 `DATABASE_URL`이 없어 API 목 화면 + 헤드리스 Chrome으로만(실제 로그인·DB 흐름, 탭 강조·상세 탭 바 숨김 화면 확인, 푸시·iOS 안내, 포커스 윤곽, 관리자 1040 폭은 못 봄). 설계 밖 보정(승인 범위 안): `:where(.page, .auth-shell)` 프리플라이트 복원, 관리자 `max-w-admin`, 표 가로 스크롤, `.field min-width:0`. 스킬 `design-taste-frontend`(아이콘 직접 그린 SVG는 승인 설계 우선).
    - code-review: 치명·주요 없음, 재위임 없음. 설계-코드 일치, API·인증·41 문구 회귀 없음, 지연 삭제 데이터 손실 경로 없음, C10 삭제 클래스 미사용 확인.
53. **후속(2026-10-03, 52 구현·검수에서 나옴, 차단 아님)**:
    - (a) **push 여부(사용자 결정 필요)**: 로컬이 원격보다 5개 이상 앞섬(52 커밋 포함). 45·51(c) 보류 유지인지.
      - **결정(2026-10-03, user, 메인 세션 전달)**: 지금 배포 — 52 청안 적용 + 53(b) 수정을 `git push origin master`로 올려 Vercel 자동 배포. 배포 후 검증(로그인, 한글 Enter 1회 전송, 390/768/1200)은 메인 세션·사용자.
      - push 완료(2026-10-03, git-manager): build 통과 후 `bbd8fa3..86350a7` 9커밋, 원격과 일치. Vercel 배포 상태·운영 화면 검증은 pm 쪽 도구가 없어 확인 못 함 — 메인 세션·사용자 확인 대기.
      - 배포 방식 변경(2026-10-03, user, 메인 세션 전달): GitHub 자동 배포 대신 메인 세션이 `web/`에서 `vercel deploy --prod` 직접 실행. 기록 커밋 `5a985f3` push는 나중. pm 분배 작업 없음, 배포·운영 검증 결과 대기(이 줄은 결과 기록 때 함께 커밋).
54. **사용자 결정 필요(2026-10-04, 새 요청 — Google 로그인 이름 자동 저장·온보딩 이름 입력 제거)**: pm이 분배 전에 멈춤. 설계 호출·설계 문서 변경 없음, "승인된 설계" 그대로.
    - 요청 전제와 실제가 다르다(pm 확인):
      - Google 이름은 이미 저장된다 — `web/lib/auth-adapter.ts`가 가입 시 `users.name`에 넣고 재로그인 때 `coalesce`로 갱신. 스키마에도 `users.name`(null 허용, "화면 표시용, 필수 아님(개인정보 최소화)")이 있다([[anyang-database-schema]]). 스키마·마이그레이션 변경 불필요.
      - 온보딩에는 이름 입력이 없다 — `web/app/onboarding/onboarding-form.tsx`는 생년·성별·직군·재학재직 4항목뿐. 지울 필드 없음.
    - 실제로 바뀌는 것은 "채팅에서 저장된 계정 이름을 바로 쓰기"뿐인데, 확정 결정과 충돌한다: [[anyang-ai-models-data-transfer]] "계정의 이름·이메일·계정 ID 필드는 계속 보내지 않는다"(user, 2026-09-29, 43). 대화에서 직접 말한 이름만 예외로 허용돼 있다.
    - (a) **계정 이름(`users.name`)을 채팅 시스템 프롬프트로 DeepSeek에 보내도 되는지** — 허용하면 결정 문서 갱신(decided_by user). 허용 안 하면 이 요청은 할 일이 없다(지금처럼 대화에서 말한 이름만 기억).
    - (b) 허용 시 처리 방식: ① 매 채팅 프롬프트에 `users.name`을 넣는다(backend만, 기억 테이블 무관) ② 첫 로그인 때 "사용자 이름은 ○○다" 기억 문장으로 저장(Gemini 임베딩 전송도 추가, 사용자가 기억 화면에서 지울 수 있음). 권장 ①(전송 범위가 작고 기억 정책 무관).
    - (c) 이메일·비밀번호 가입자는 이름이 없다(`users.name` null). 그대로 둘지(대화에서 말하면 기억), 온보딩에 선택 입력란을 둘지. 권장: 그대로.
    - (d) Google 이름이 실명 전체라 호칭으로 어색할 수 있다(예: 성 포함). 그대로 쓸지, 사용자가 "내 정보"에서 고칠 수 있게 할지(화면·API 추가 → frontend·backend 설계). 권장: 이번엔 그대로, 필요하면 대화에서 "○○라고 불러줘"로 바뀌는 기존 기억 우선.
    - (e) 동의 화면·처리방침: 수집 항목은 생년·성별·직군·재학재직([[anyang-frontend-screens]] 7절 `collection_use`). 계정 이름은 이미 저장되지만 고지에 없고, AI 처리 대상이 되면 고지·재동의 필요 여부를 사용자가 정해야 한다(41-b처럼 법적 요건 확인 대상).
    - 주의(2026-10-04, pm): 승인 기록 없이 `AI-Sessions/wiki/design/anyang-user-name-memory.md`(status active, owner shared)가 생겼고, 다른 pm 세션이 backend 구현을 진행하려 해 보류시켰다. 이 문서는 계정 이름을 DeepSeek에 넣는다고 적어 [[anyang-ai-models-data-transfer]] 43 결정과 충돌하고, "온보딩 이름 필수 입력"으로 요청과도 반대다. draft로 되돌릴지 삭제할지 사용자 결정 필요.
    - 답을 받으면: (a) 허용 + ①이면 database 호출 없음. 결정 문서 갱신 → backend(시스템 프롬프트 주입, backend-api·tasks를 승인된 설계에서 뺌) → (e)에 따라 frontend(처리방침·동의 문구) 설계 → 재승인 → 구현.
    - (b) 채팅 입력에 한글 조합 중 Enter 처리(`isComposing`)가 없어 중복 전송 가능(frontend 발견, 기존 동작). 47(c) 버그 목록과 함께 처리할지.
      - **해결(2026-10-03, user 결정 "지금 수정", 메인 세션 전달)**: frontend `8d4de22` — `web/app/_lib/composer-key.ts` `shouldSubmitOnKey`(Enter·Shift 아님·`isComposing` 아님·`keyCode` 229 아님), `ui/chat.tsx` Composer 연결, 테스트 4건(npm test 244개·build 통과). 설계 변경 없음. code-review 치명·주요·경미 없음, 다른 Enter 전송 패턴 없음. 실제 한글 IME 수동 확인은 못 함(Chrome·Safari 사람 확인 권장).
      - 참고(경미, 설계 잠금 대상): [[anyang-frontend-screens]]는 채팅 키 처리 위치를 `chat-client.tsx`로 적지만 실제는 `ui/chat.tsx`의 Composer. 다음 frontend 설계 수정 때 정리.
    - (c) 경미(code-review): ① `memory-client.tsx` 버튼이 전역 `button` 규칙을 인라인 유틸리티로 덮음 — 설계 4절 4번 문장("옛 클래스를 쓰지 않는다")과 어긋남. 전역 `button` 규칙을 지울 때 함께 정리. ② `admin/admin-nav.tsx`가 인라인 style과 `.bottom-nav` 클래스를 상단 탭으로 씀(동작 정상). ③ 탭 강제 종료로 `pagehide`가 안 오면 5초 안에 지운 기억이 남음(데이터 손실 아님, 설계 범위 안). ④ `layout.tsx` 글꼴 `subsets: ["latin"]` — 한글은 포함되나 preload 안 돼 첫 렌더 글꼴 깜빡임 가능(브라우저 미확인).
    - (d) 실제 로그인 상태 390/768/1200 화면 확인은 사람이 해야 한다(`DATABASE_URL` 없는 환경).
55. **설계 변경(2026-10-04, 새 요청 — 공지 전체 수집·즉시 갱신·공지 화면 시안 반영)**: 안양시 청년 게시판 전체(462건, pageIndex 1~47)의 제목·본문·첨부 정보를 `/notices`에 보이고, 새 글은 분 단위로 반영한다. 계획은 사용자 승인(메인 세션 전달, 계획서 `C:\Users\whwlg\.claude\plans\https-www-anyang-go-kr-youth-selectbbsnt-keen-sunbeam.md`). 현재 notices 0건·collect_runs 0건, DB에 pg_cron·pg_net 미설치, 게시판 RSS 없음(메인 세션 확인).
    - 사용자 결정(2026-10-04, user): ① 첨부는 링크만(파일명+URL, jsonb) ② 별표 고정 공지 + "본문 이미지" 배지 둘 다 → `notices`에 `is_pinned`·`image_count`·`attachments` ③ 스케줄 pg_cron + pg_net: `collect-quick` `*/10 * * * *`(목록 1페이지, DB에 없는 nttNo만 상세, 이어서 임베딩), `collect-full` `0 19 * * *` UTC(1~2페이지 상세 재확인, contentHash 수정 감지), 라우트 `?mode=quick|full`, `x-scheduler-secret` 유지, 진행 중 실행이 있으면 건너뜀. Vercel Cron 미사용 ④ 백필은 로컬 일회성 스크립트 `web/scripts/backfill.ts`(1~47페이지, skipExisting, 임베딩 루프) ⑤ `notices-list`가 visibilitychange·재진입 시 재조회, API no-store, Realtime 없음. 기록: [[anyang-service-scope]](수집 범위·화면 표시), [[anyang-deployment-portability]](수집 트리거).
    - 진행: 설계 6종(`anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`·`anyang-frontend-screens`·`anyang-frontend-tasks`·`anyang-cheongan-design-adoption`)을 승인된 설계에서 뺐다(16차). 설계 database → backend → frontend draft 후 사용자 재승인, 구현은 재승인 뒤. `anyang-user-name-memory`(54, 미승인)는 이번 범위와 섞지 않는다.
    - 열린 항목:
      - (a) 수집기 USER_AGENT 문의 이메일이 `TODO-문의이메일`로 남아 있다(`web/lib/collector.ts:17`). 사용자가 쓸 연락처를 정해야 한다. 임의 입력·저장하지 않는다.
      - (b) 고정 공지 마크업 미확인. 구현 첫 단계에서 실제 HTML을 받아 판정 규칙을 확정한다.
      - (c) `image_count` 정의(본문 `<img>`만인지, 이미지 첨부 포함인지) — 실제 HTML을 본 뒤 사용자 확인.
      - (d) 추천 정렬(벡터 유사도)에서 고정 공지를 맨 위로 올릴지. 계획 권장: "최근 공지" 정렬에서만 위로, 추천 정렬에서는 별표만.
      - (e) pg_cron → Vercel POST 최종 확인: 운영 GET 405로 보호 미적용을 간접 확인(39 갱신). 확장 설치 후 POST 1회, 막히면 `x-vercel-protection-bypass`, 그래도 안 되면 GitHub Actions 대체. 확장 설치와 URL·시크릿 입력은 사용자 승인이 필요한 운영 작업(40과 연결).
      - (f) 확인 주기 10분은 권장안. 5분·30분, 야간 주기 늘리기 가능.
      - (g) 정밀 점검은 최근 1~2페이지(20건)만 보므로 오래된 글 수정은 반영되지 않는다. 필요하면 주 1회 전체 재확인을 후속으로 검토.
      - (h) 2단계(이번 범위 밖): 포스터 이미지만 있는 글은 본문이 비어 추천에 불리하다. Gemini 이미지 읽기로 본문 보강을 별도 설계로 검토(24와 연결).
      - (i) 첨부 직접 링크(`downloadBbsFile.do`)가 세션 없이 열리는지 미확인. 계획은 원문 페이지 링크를 기본 경로로 둔다.
    - **설계 draft 완료(2026-10-04)**: database [[anyang-database-schema]](notices 컬럼 3개, 0021 up/down 계획 — 백필 후 down은 사용자 승인, 0019 RLS 새 컬럼 적용, collect-quick·collect-full 잡, `collect_runs` `status='running' and finished_at is null`로 진행 중 판정). backend [[anyang-backend-api]] 5-1·7·2-1·13-1절, [[anyang-backend-tasks]] 5-1~5-5(겹침 방지 `pg_try_advisory_xact_lock` — 트랜잭션 풀러라 세션 락 안 씀, mode 생략 시 full·잘못된 값 400 `INVALID_MODE`, 겹침 시 라우트 200 `skipped`·관리자 수동 실행 409). frontend [[anyang-frontend-screens]]·[[anyang-frontend-tasks]](N1~N3)·[[anyang-cheongan-design-adoption]](배지 문구 교체, 별표·칩·첨부 영역·조용한 재조회). frontend가 자구만 정리: 41-b 줄바꿈 "(미확정)", 35행 draft 서술, 채팅 키 처리 위치 `ui/chat.tsx`. 재승인 대기.
    - 설계에서 새로 나온 질문:
      - (j) **`notices.content_hash`가 unique**라 제목·본문이 같은 서로 다른 글은 둘째가 저장되지 않는다(backend 발견). backend draft는 `source_url` 기준 비교로 바꾸고 해시 충돌은 건너뛰며 `skippedDuplicateCount`로 센다. 그래서 백필 뒤 건수가 462보다 적을 수 있다. 462건 전부 담아야 하면 스키마 변경(database) 필요. 사용자 결정. → 결정됨(아래 "사용자 결정·승인"): unique 해제, `source_url`만, 건너뛰기 로직 제거.
      - (k) "최근 공지"(선호 없음) 정렬을 `collected_at desc` → `is_pinned desc, published_at desc nulls last, id desc`로 바꾸는 backend 제안(백필 뒤 수집 시각이 거의 같아짐).
      - (l) 비정상 종료로 남은 `running` 행의 stale 시간 N(제안 10분)과 그런 행을 `failed`로 정리할지.
      - (m) pg_net 호출 쪽이 먼저 끊었을 때 Vercel 함수가 끝까지 도는지 미확인. full(약 44초, 추정)로 최종 POST 확인 때 검증(55-e와 함께).
      - (n) 백필 실행 도구: `tsx`가 `package.json`에 없다. `npx tsx` 사용 또는 devDependency 추가 중 결정.
      - (o) 55-a: backend 제안 — 연락처를 환경변수(예: `COLLECTOR_CONTACT`)로 받고 값이 정해질 때까지 `TODO-문의이메일` 유지.
      - (p) `image_count`가 본문 `<img>`만이면 첨부로만 이미지가 있는 글에는 배지가 안 뜬다(55-c와 함께 결정). 포스터만 있는 글의 상세 안내 상자(`ImageNote`)는 결정 범위 밖이라 넣지 않았다 — 필요하면 별도 요청.
      - (q) frontend 테스트 환경이 node(DOM 없음)라 `renderToStaticMarkup`·순수 함수로만 검사. jsdom·testing-library를 쓰려면 의존성 추가 승인 필요.
    - **사용자 결정·승인(2026-10-04, user, 메인 세션이 직접 받아 전달)**: (j) 글 주소 기준으로 전부 저장 — `content_hash` unique 해제(0021에 포함), 중복 판정은 `source_url`만, 해시는 수정 감지용, 462건 모두 저장. (k)·(d) 고정 공지는 "최근 공지"(선호 없음)에서만 위로(`is_pinned desc, published_at desc`), 추천 정렬은 유사도 순서 유지·별표만. (c)·(p) `image_count` = 본문 img + 이미지 확장자(jpg·jpeg·png·gif·webp 등) 첨부 합산, 작은 이모지·아이콘 img 제외 규칙은 구현 첫 단계에서 실제 HTML로 정함. 나머지 제안값 전부 확정: (l) stale N=10분·failed 정리, (n) `npx tsx`, (a)·(o) `COLLECTOR_CONTACT` 환경변수(실제 값은 사용자가 Vercel에 직접 입력, 임의 생성 금지), (q) `renderToStaticMarkup`, frontend 시각값·문구, 재조회 30초. 설계 6종은 위 값을 반영한 상태로 승인("제안대로 승인"). push는 승인 안 됨.
    - 결정 반영(2026-10-04): database(0021에 `notices_content_hash_key` drop, down은 중복 해시 생기면 실패 → 승인 필요, stale 10분·failed 정리), backend(`source_url`만·건너뛰기 제거·count 462, 정렬, image_count 합산, `COLLECTOR_CONTACT` 미설정 시 연락처 없는 UA, `npx tsx`), frontend(정렬·시각값·문구 확정, 55-i만 미확인).
    - (r) **사용자 확인 필요(차단 아님, 구현 진행)**: 배지 문구 "본문 이미지"와 `image_count` 정의(본문 img + 이미지 첨부)가 어긋난다 — 첨부 이미지만 있는 글에도 "본문 이미지" 칩이 뜬다. 문구를 유지할지("이미지" 등으로 바꿀지) 결정 필요. 결정 전까지 "본문 이미지" 유지.
    - **구현 완료(2026-10-04)**: database `6b89b53`(0021 up/down, collect-job-trigger.sql 두 잡 템플릿, 운영 미적용), backend `46c7ba1`(수집기 isPinned·attachments·imageCount, quick/full/backfill, advisory xact lock·stale 10분, 라우트 mode·관리자 409, 조회 API 필드·정렬·no-store, `COLLECTOR_CONTACT`, `web/scripts/backfill.ts`, 실제 HTML 픽스처), frontend `c8db497`(별표·"본문 이미지" 칩·`star` 아이콘, 상세 첨부 영역·"원문 페이지에서 보기", visibilitychange·pageshow 재조회 30초; 스킬 `design-taste-frontend`). code-review: 치명·주요 없음, 경미 3 → 재위임 1회 frontend `b714fa1`(더 보기 병합 id 중복 제거)·backend `221d019`(`published_at` null 덮어쓰기 방지 coalesce) → 재검수 해소. npm test 276개·build 통과. 화면(390·1200), 백필, 고정 공지 실측은 못 함.
    - backend 실측 결과(2026-10-04, 목록 1~2페이지·상세 7건, 2초 간격): 첨부 `ul.p-attach a.p-attach__link`(href `./downloadBbsFile.do?atchmnflNo=N` → 절대 URL, 파일명은 `.p-icon`이 아닌 span). 고정 공지는 실측 20건에 없어 사이트 CSS `.p-table .p-notice` 근거로 `tr.p-notice` 판정(55-b 미실측 — 틀리면 isPinned가 항상 false, 수집 영향 없음. 고정 공지가 올라오면 재확인). `span.p-icon__hot`(핫이슈)은 고정 판정에 안 씀. img 제외: CKEditor 이모지(`/plugin/ckeditor/plugins/smiley/`). 응답 시간: 목록 0.74초(한 번 6.5초), 상세 0.53~1.57초, quick 새 글 0건 약 4~5초. 이미지 첨부 글은 본문 텍스트에 "사진 확대보기"가 섞인다(추출 변경 시 해시가 바뀌어 전체 재임베딩이라 그대로 둠, 필요하면 별도 요청).
    - (s) **설계 변경 필요(2026-10-04, code-review 경미 3)**: backend가 구현 단계에서 `div.p-photo` 안의 `<img>`를 image_count에서 뺐다. 사이트가 이미지 첨부를 본문 끝 `.p-photo`에 다시 그려(src가 첨부 미리보기 경로와 같음, 7건 중 3건) 합산하면 한 장이 2로 세어지기 때문이다. 승인 범위는 "이모지·아이콘 제외 규칙"이라 이 규칙은 [[anyang-backend-api]]에 없다. 부작용: 첨부 파일명에 이미지 확장자가 없는데 `.p-photo`로 그려진 이미지는 0으로 센다. 그래서 `anyang-backend-api`를 승인된 설계에서 뺐다(18차). 사용자가 이 규칙을 승인하면 backend가 5-1절에 한 줄 반영 후 재기록. 코드는 이미 이 규칙으로 커밋됨(`46c7ba1`).
    - (t) 운영 순서(backend·database): ① 0021 운영 적용(적용 직전 `notices_content_hash_key` 이름 확인, 적용 후 컬럼 3개·제약 제거·0019 점검 SQL 2개 0행) → ② 이 코드 배포(0021 전에 배포하면 수집·조회 쿼리가 새 컬럼 때문에 실패) → ③ 백필(`npx tsx`로 `--pages 1-2` 시험 후 1~47) → ④ pg_cron·pg_net 설치·잡 등록(URL·`SCHEDULER_SHARED_SECRET`, 40) → ⑤ 최종 POST·`full` 타임아웃 확인(55-e·m). `COLLECTOR_CONTACT` 값은 사용자가 Vercel에 직접 입력. 0021 down은 백필 뒤엔 중복 해시로 실패·값 손실 → 사용자 승인 필요. 전부 사용자 승인 대상, 미실행.
    - **결정(2026-10-04, user, 메인 세션 전달)**: (s) 승인 — `div.p-photo` img 제외, backend가 5-1절 반영 후 19차 재기록. (r) 배지 문구를 "이미지"로 바꾼다 — frontend 설계·코드·테스트 수정(그래서 `anyang-frontend-screens`·`anyang-frontend-tasks`·`anyang-cheongan-design-adoption`을 승인된 설계에서 뺐다가 반영 후 재기록). 운영 작업 승인: 0 결정 반영 커밋 → ① 0021 운영 적용 → ② push·배포 확인 → ③ 백필(1-2 시험 후 1~47, count 462·청크 확인, `COLLECTOR_CONTACT` 비어도 됨) → ④ pg_cron·pg_net 설치·잡 등록 준비(시크릿 값은 문서·로그·보고에 남기지 않음, 사용자 입력 직전까지). 각 단계 실패 시 멈춤. ⑤는 메인 세션.
    - **운영 작업 진행(2026-10-04)**: 0 결정 반영 — backend-api 5-1절, frontend `0c66ed0`(칩 "이미지", `notices-refetch.ts` 공백 수정, test 276·build 통과), 문서 `e770734`, 승인된 설계 19차. ① 0021 운영 적용 완료(MCP apply_migration 단일 트랜잭션 + `schema_migrations` 기록; 적용 후 컬럼 3개 NOT NULL·기본값 일치, unique는 `notices_source_url_key`만, 0019 점검 SQL 2개 0행, notices 0·collect_runs 0건; `get_advisors`는 도구 없어 미실행 — 메인 세션). ② push `86350a7..e770734`(16커밋, 원격 일치), 자동 배포 아님 확인 → backend가 53(a) 방식 `vercel deploy --prod` 실행, Ready, 운영 별칭 `web-beta-smoky-16.vercel.app` 갱신, `/login` 200, 수집 라우트 시크릿 없이 401, 10분간 error 로그 없음(새 코드 반영은 시크릿 없이는 응답으로 구별 불가). ③ **백필 1단계에서 멈춤**: `web/.env.local`에 `DATABASE_URL`이 없다(GEMINI_API_KEY는 있음). 운영 DB 접속·쓰기 없음. 사용자가 운영 Supabase 연결 문자열(트랜잭션 pooler 6543)을 `web/.env.local`의 `DATABASE_URL`로 넣은 뒤 pm 재호출 → `npx tsx --env-file=.env.local scripts/backfill.ts --pages 1-2`부터. ④ pg_cron·pg_net 준비는 지시대로 ③ 실패로 진행하지 않음(37의 같은 원인과 연결).
    - **백필 방식 변경(2026-10-04, user, 메인 세션 전달)**: 사용자는 `DATABASE_URL`을 로컬에 넣지 않는다. Vercel의 `DATABASE_URL`·`SCHEDULER_SHARED_SECRET`은 Sensitive라 읽을 수 없고, "기존 값은 절대 변경 금지". 선택: 백필 전용 키 추가 — 메인 세션이 `BACKFILL_SECRET`을 Vercel production(sensitive)과 `web/.env.local`에 추가(값 미기록, 기존 환경변수 변경 없음). 로컬 `scripts/backfill.ts`는 쓰지 않는다(파일은 둔다). 승인된 설계 값(별도 재승인 불필요): ① `POST /api/jobs/collect?mode=backfill&from=N&to=M`, 인증은 `x-backfill-secret` ↔ `BACKFILL_SECRET` timingSafeEqual, 비어 있으면 backfill 비활성(401), `x-scheduler-secret` 경로(quick/full)는 그대로, backfill은 `x-scheduler-secret`으로 불허 ② 한 호출 최대 5페이지(1 ≤ from ≤ to ≤ 47, to−from+1 ≤ 5, 위반 400), skipExisting=true, 기존 advisory lock 겹침 방지 ③ 수집 뒤 같은 요청에서 임베딩을 남은 시간(예: 250초 경과 시 중단)까지 반복, 응답에 `collected_count`와 남은 미임베딩 건수. `/api/jobs/embed`도 `x-backfill-secret` 허용(비어 있으면 불허) ④ 백필이 끝나면 사용자가 원할 때 Vercel에서 `BACKFILL_SECRET`을 지워 비활성화(코드 변경 없음). 배포 뒤 실제 백필 호출은 메인 세션이 한다. 4단계 pg_cron은 보류. 그래서 `anyang-backend-api`·`anyang-backend-tasks`를 승인된 설계에서 뺐다(20차 전 단계).
    - (v) **사용자 확인 필요**: `SCHEDULER_SHARED_SECRET` 값을 아무도 모른다(Vercel Sensitive, 2026-09-28 생성값 미보관 — 40). pg_cron 잡이 `x-scheduler-secret`을 보내려면 같은 값을 Supabase Vault에 넣어야 한다. 기존 값 변경은 사용자 지시로 금지라 pm은 변경을 제안하지 않는다. 사용자가 값을 확보할 방법을 정해야 한다.
    - 백필 설계 반영(2026-10-04, backend): backend-api 5-1절 7번 "서버 분할 호출"(호출 순서 1~5 … 46~47의 10회), 7절 스케줄러 표, 9절 `BACKFILL_SECRET`(값 없음), 테스트 방법(인증 4분기·범위 400·겹침·시간 예산·embed 인증), backend-tasks 5-3. 따라 나온 확정: 401/403 구분 없이 401, backfill에 scheduler 시크릿은 맞아도 401, quick/full은 `x-backfill-secret` 불허, 검사 순서 인증→mode→범위, 임베딩 실패 시 수집은 성공 유지·반복 중단.
    - (w) **사용자 확인 필요(차단 아님, 제안값 그대로 구현)**: backend 제안 `(미확정)` 3건 — 시간 예산 상수 250초(사용자 예시값), 응답 필드명 `remaining_unembedded`, 범위 위반 400 코드 `INVALID_RANGE`. 20차 승인 범위 밖, 확정되면 `(미확정)` 표시만 지운다.
    - **백필 구현(2026-10-04)**: backend `e9d1805`(collect backfill 모드·embed 라우트 `x-backfill-secret`·`countUnembedded`, test 297·build 통과). push·배포 안 함. code-review: 치명 없음, 보안 경계(빈 시크릿, 길이 다른 값, 시크릿 분리, 인증 순서, 로그) 문제 없음, 범위 검증 문제 없음.
    - (x) **사용자 결정 필요(2026-10-04, code-review 주요 — 설계 변경 필요)**: 임베딩 반복은 시작 시각이 250초 미만이면 `runEmbedJob`(최대 15건, Gemini 순차 호출, fetch 타임아웃 없음, 재시도 백오프 최대 7초/호출)을 한 번 더 시작한다. 249초에 시작한 마지막 호출이 `maxDuration` 300초를 넘기면 함수가 강제 종료되고, 청크 단위 insert가 공지 도중에 끊긴다. 그 공지는 "청크 있음"으로 취급돼 나머지 청크가 다시 임베딩되지 않는다(기존 취약성, 백필이 만날 확률을 높임). 선택지: (1) 예산을 낮춘다(예: 200초) — 값 변경만, 가장 단순 (2) `runEmbedJob`을 공지 단위로 시간 예산에 연동 — 코드·설계 변경이 더 큼. pm 권장 (1). 정상 응답 속도면 수십 초 안에 끝나므로 위험은 Gemini 지연·429 때다. 함께: 수집 단계 시간(5페이지 × 10건 × 2초 ≈ 100초+, 목록 1페이지 항목 수 실측 필요)은 `from=1&to=2` 시험 호출로 실측 권장. 그래서 `anyang-backend-api`를 승인된 설계에서 뺐다(20차 이후). push·배포는 이 결정 뒤로 미뤘다.
    - (y) 경미(code-review): `web/lib/scheduler-auth.ts:3-4` 낡은 주석(구현 수정, backend). `remaining_unembedded`가 건수 조회 실패 시 null — 설계 6번 표에 null 경우 한 줄 보강 필요(설계 변경, (x)와 함께).
    - **결정(2026-10-04, user, 메인 세션 전달)**: (x) 선택지 (1) — 임베딩 반복의 새 묶음 시작 기준 200초(250초 대체), 상수만 변경, `runEmbedJob` 구조 그대로. (w) `remaining_unembedded`·`INVALID_RANGE` 제안대로 확정. (y) 조회 실패 시 `remaining_unembedded` null을 설계 표에 보강, `scheduler-auth.ts` 낡은 주석 정리(동작 변경 없음). 이어서 21차 → 구현·재검수 → 커밋 → push → `vercel deploy --prod`. 실제 백필 호출은 메인 세션. 55(v) 보류 유지.
    - **반영·배포 완료(2026-10-04)**: backend 설계 반영 → 21차 → 구현 `71a138d`(200초 상수, scheduler-auth 주석, 테스트; test 297·build 통과) → code-review 재검수 치명·주요·경미 0(잔여 위험: 마지막 묶음이 100초를 넘으면 300초 초과 가능 — Gemini 지연·429 때, 사용자 선택 (1)의 범위, 필요하면 선택지 (2)를 별도 설계로) → push `e770734..71a138d`(4커밋, 원격 일치) → `vercel deploy --prod` Ready(`dpl_ErU6b4BaNJsFh6yzS3Qi7QRdrgTC`, 운영 별칭 갱신), `/login` 200, 시크릿 없이 backfill·embed 401, 10분간 error 로그 없음. 실제 백필 호출(5페이지씩, 462건·청크 확인)은 메인 세션. 끝나면 사용자가 Vercel에서 `BACKFILL_SECRET` 삭제(선택).
    - (u) 경미(문서·서식, 차단 아님): [[anyang-database-schema]] 1439행이 advisory lock·`collect_runs.mode`를 아직 "미확정(55)"으로 적는다(사용자가 확정, backend-api에는 반영). `web/app/_lib/notices-refetch.ts:23` `type Doc =Pick` 공백 누락. 다음 수정 때 정리.
    - **재승인 때 확인할 제안값(`(미확정)`)**: database — stale N. backend — 겹침 방지 방식·응답(200 skipped / 409), mode 기본 full, (k) 정렬, (j) 해시 처리, image_count 잠정 정의(본문 img만). frontend — 별표 `accent` 16px 제목 앞·일반 제목 굵기 500, 아이콘 `star` 추가(14개), 칩(테두리만, 날짜 오른쪽, 개수 없음), 첨부 0개면 영역 숨김·파일명은 링크 아닌 글자·안내 "파일은 원문 페이지에서 받을 수 있어요.", 버튼 "원문 페이지에서 보기", 재조회 최소 간격 30초·조용한 병합·`pageshow` 포함.

## 승인된 설계

2026-09-28(4차): 33 취소(user)로 33 내용을 제거하고 5종을 다시 기록한다. 남은 변경은 확인 항목 32 승인값 반영과 괄호 안 (미확정) 표기 정리뿐이다. 문서 안의 값은 모두 확정이며, 정리 잡 pg_cron 등록만 사용자 결정 대기다.

2026-09-28(5차): `anyang-database-schema`를 뺀다 — 사유: 확인 항목 35(공개 API 차단) 반영을 위한 설계 수정. 재승인 뒤 다시 기록한다.

2026-09-28(6차): 사용자 재승인으로 `anyang-database-schema`를 다시 기록한다(35 반영본, 커밋 1e59171). 점검 SQL 문구와 `migrate.sh up` 실패 출력 형식은 문서에 적힌 값 그대로 이번 승인으로 확정. 확인 항목 36은 보류 유지.

2026-09-28(7차): `anyang-frontend-screens`와 `anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 41(동의 화면·처리방침의 국외 이전·서비스명 문구를 "AI 처리" 표현으로 단순화, 새 요청). 두 문서 7·9절과 작업 문서에 해당 문구가 확정값으로 적혀 있다. 재승인 뒤 다시 기록한다.

2026-09-28(8차): 사용자 재승인(메인 세션 전달)으로 `anyang-frontend-screens`·`anyang-frontend-tasks`를 다시 기록한다(draft 커밋 ddb7192). frontend-screens 확인 항목 2의 제안 문구(legend·라벨·가림 안내 유지·처리방침 문구) 전부 확정. 사용자가 41-b 법적 위험을 감수하고 진행.

2026-09-29(9차): 설계 문서 5종을 모두 뺀다 — 사유: 확인 항목 43(채팅 기억 주입·매 답변 추출·이름 기억, 새 요청). 설계 수정 후 재승인 뒤 다시 기록한다.

2026-09-29(10차): 확인 항목 43 사용자 재승인(설계 draft 커밋 893918a). 3종을 먼저 다시 기록한다. `anyang-backend-api`와 `anyang-backend-tasks`는 43-b(부분 답변 저장) 단락을 backend가 추가한 뒤 같은 승인으로 기록한다.

2026-09-29(10차 이어서): backend가 43-b 부분 답변 저장을 backend-api 3-3-2절·테스트 방법과 backend-tasks 6번에 반영했다. 같은 승인(43 재승인)으로 두 문서를 기록했다.

2026-10-03(11차): `anyang-backend-api`와 `anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 46(Jev 게이트 도입, 새 요청). 재승인 뒤 다시 기록한다.

2026-10-03(12차): `anyang-database-schema`를 뺀다 — 사유: 확인 항목 48(모순 선호 대체, 새 요청). 재승인 뒤 다시 기록한다.

2026-10-03(13차): 확인 항목 48 최종 결정(user, 메인 세션 전달 — 안 2a `previous_fact`, 나머지 제안값 전부 채택)을 database → backend가 draft에 반영한 뒤 3종을 기록한다. 승인 범위는 48이다. backend 두 문서 안의 46(Jev 게이트) 3-3-3절·6-1은 보류 상태로 승인 범위 밖이며 그 `(미확정)`은 확정이 아니다(46 재개 때 문서를 다시 빼고 재승인). (f-8) 문구 정합성은 보류. 결정 밖 세부(사용자 PUT 시 `previous_fact` 그대로, 운영자 swap 시 `updated_at` 그대로·임베딩 재계산 스크립트 범위 밖)는 문서에 적힌 제안 그대로 "제안값 전부 채택" 결정으로 본다.

2026-10-03(14차): `anyang-frontend-screens`와 `anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 52(청안 디자인 웹 적용, 새 요청). 재승인 뒤 다시 기록한다.

2026-10-03(15차): 확인 항목 52 사용자 승인(메인 세션 전달, draft 커밋 0e06c78). 세 문서에 적힌 제안값 전부 확정(탭 순서는 청안 시안대로 대화·공지·알림·내 정보, 사이드바 240px, 테마색 `#F5F3ED`, 채팅 조건 줄 2개 필드, C10 삭제 승인 포함). 47(c)①은 범위 밖.

2026-10-04(16차): `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`·`anyang-cheongan-design-adoption`·`anyang-frontend-screens`·`anyang-frontend-tasks` 6종을 뺀다 — 사유: 확인 항목 55(공지 전체 수집·즉시 갱신·공지 화면 시안 반영, 새 요청). 재승인 뒤 다시 기록한다. 현재 승인된 설계 문서 없음.

2026-10-04(17차): 확인 항목 55 사용자 결정·승인(메인 세션 전달 — (j) `source_url`만·unique 해제, (k)·(d) 최근 공지만 고정 위로, (c)·(p) image_count 합산, 나머지 제안값 전부, "제안대로 승인")을 database → backend → frontend가 반영한 뒤 6종을 기록한다. 55-b(고정 공지 마크업)·이모지·아이콘 img 제외 규칙은 구현 첫 단계에서 실제 HTML로 정하는 것으로 승인됐다. 55-i(첨부 직접 링크)와 (r)(배지 문구)는 승인 범위 밖 미결이다.

- [[anyang-database-schema]] — 승인일 2026-10-04, 승인자 user

2026-10-04(18차): `anyang-backend-api`를 뺀다 — 사유: 확인 항목 55(s) code-review "설계 변경 필요"(image_count에서 `div.p-photo` img 제외 규칙이 설계에 없음). 사용자 확인 후 재기록한다. 같은 날 18차로 `anyang-frontend-screens`·`anyang-frontend-tasks`·`anyang-cheongan-design-adoption`도 뺀다 — 사유: 55(r) 배지 문구 "본문 이미지" → "이미지"(user 결정). 반영 후 19차로 재기록한다.

2026-10-04(19차): 55(s)·(r) 사용자 결정(메인 세션 전달)을 backend(5-1절 p-photo·smiley 제외 규칙, 실측 셀렉터)와 frontend(칩 문구 "이미지", `0c66ed0`)가 반영한 뒤 4종을 다시 기록한다. 55-b(고정 공지 실측)·55-i(첨부 직접 링크)는 미확인 그대로다.

- [[anyang-frontend-screens]] — 승인일 2026-10-04, 승인자 user
- [[anyang-frontend-tasks]] — 승인일 2026-10-04, 승인자 user
- [[anyang-cheongan-design-adoption]] — 승인일 2026-10-04, 승인자 user

2026-10-04(19차 이어서): `anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 55 백필 방식 변경(서버 분할 실행, `BACKFILL_SECRET`, user 결정). backend 설계 반영 후 20차로 재기록한다.

2026-10-04(20차): 백필 방식 변경(user, 메인 세션 전달 — "사용자가 승인한 설계 값, 별도 재승인 불필요")을 backend가 반영한 뒤 2종을 다시 기록한다. 승인 범위는 전달된 값 1~4와 그로부터 직접 따라 나온 값이다. 55(w) 제안값 3건(250초, `remaining_unembedded`, `INVALID_RANGE`)은 `(미확정)` 그대로 승인 범위 밖이다.

2026-10-04(20차 이어서): `anyang-backend-api`를 뺀다 — 사유: 확인 항목 55(x) code-review "설계 변경 필요"(백필 임베딩 시간 예산 250초가 maxDuration 300 안에서 안전하지 않음). 사용자 결정 후 재기록한다. 같은 사유로 `anyang-backend-tasks`도 뺀다(5-3에 250초가 적혀 있음).

2026-10-04(21차): 55(x)·(w)·(y) 사용자 결정(메인 세션 전달 — 200초, `remaining_unembedded`·`INVALID_RANGE` 확정, null 보강)을 backend가 반영한 뒤 2종을 다시 기록한다.

- [[anyang-backend-api]] — 승인일 2026-10-04, 승인자 user
- [[anyang-backend-tasks]] — 승인일 2026-10-04, 승인자 user

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

2026-10-03 (확인 항목 46, 메인 세션 제안) — **보류(2026-10-03, user)**: 운영 서비스 Jev 적용 시 재개.

```text
- 위치: /api/chat의 extractPreferences 직전 ([[anyang-backend-api]] 3-3절 근처 Jev 게이트 절)
- 판단: Noul — 사용자 메시지에 본인 사실(선호·상황·이름·호칭)이 있는가
- 속도: 현재 답변마다 DeepSeek 추출 호출 → Jev 약 0.6초 (추정, 근거: 2026-09-28 메인 세션 하네스 실측)
- 토큰: 현재 0.4~1k/회 × 매 답변(대부분 빈 배열로 추정, 실제 비율은 api_usage_logs 확인 필요) → Jev 측정 불가 (근거 없음 — TYPESAFE_API_KEY 준비 후 대표 입력 3종 측정)
- 주의: 오판(거짓 음성) 시 기억 누락. 사용자 메시지가 TypeSafe(미국)로 새로 전송됨 — 처리방침 반영 여부 사용자 확인(46-a)
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
- [[anyang-cheongan-design-adoption]]
