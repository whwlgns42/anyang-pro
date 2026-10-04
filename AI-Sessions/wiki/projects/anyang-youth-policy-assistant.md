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
    - (v) 갱신(2026-10-04): 수집이 보드로 옮겨져(56) `SCHEDULER_SHARED_SECRET`은 수집에 더 이상 필요 없다. 알림 잡 등록 때 다시 다룬다.
    - (u) 경미(문서·서식, 차단 아님): [[anyang-database-schema]] 1439행이 advisory lock·`collect_runs.mode`를 아직 "미확정(55)"으로 적는다(사용자가 확정, backend-api에는 반영). `web/app/_lib/notices-refetch.ts:23` `type Doc =Pick` 공백 누락. 다음 수정 때 정리.
    - **재승인 때 확인할 제안값(`(미확정)`)**: database — stale N. backend — 겹침 방지 방식·응답(200 skipped / 409), mode 기본 full, (k) 정렬, (j) 해시 처리, image_count 잠정 정의(본문 img만). frontend — 별표 `accent` 16px 제목 앞·일반 제목 굵기 500, 아이콘 `star` 추가(14개), 칩(테두리만, 날짜 오른쪽, 개수 없음), 첨부 0개면 영역 숨김·파일명은 링크 아닌 글자·안내 "파일은 원문 페이지에서 받을 수 있어요.", 버튼 "원문 페이지에서 보기", 재조회 최소 간격 30초·조용한 병합·`pageshow` 포함.
56. **설계 변경(2026-10-04, 메인 세션 실측 — 안양시 클라우드 IP 차단, UNO Q 보드 수집기)**:
    - 확인된 사실(메인 세션 실측): ① 서버 백필 시험 호출(`from=1&to=2`)이 200 `{collected_count:0}`으로 2.5초 만에 끝났고 `collect_runs`에 success 0건 1행이 남았다. ② 원인은 클라우드 IP 차단이다. Supabase(AWS 서울)에서 pg_net으로 목록을 GET하면 200, 10KB "IP 차단 안내" 페이지(meta description "IP 차단 안내", `p-subject` 0개)가 온다. Vercel icn1도 AWS 서울이라 같다. 가정용 회선(개발 PC, UNO Q)은 정상(90KB, `p-subject` 10개). 차단 기준은 미확인. 진단용으로 Supabase에 pg_net 확장을 설치했다(55 4단계 승인 범위). ③ Vercel·pg_cron 직접 수집은 불가. ④ UNO Q 보드: SSH 키 접속 가능(접속 정보는 raw 문서 `AI-Sessions/raw/arduino-server/아두이노-보드-포트-및-접속-방법.md`, 읽기만), Debian 13, Node v20.20.2, RAM 3.6G, PostgreSQL 17.10 실행 중(data_directory eMMC `/var/lib/postgresql/17/main`, 기존 DB `agentvault_licensing`·`aura_cafe` — 건드리지 않음), pgvector 없음, USB `/dev/sda1` ext4 15G가 `/mnt/usb`(fstab nofail, 1.1G 사용, apps·data·monitor-data·postgresql(postgres 소유)·public). 보드는 다른 서비스(AgentVault, 모니터, 시험 서버 등)도 운영 중.
    - 사용자 결정(2026-10-04, user): 수집은 UNO Q 보드가 맡는다. 보드 PostgreSQL은 "수집 보관함 + 전송 대기열", 저장 위치 USB. 앱 주 DB는 Supabase 그대로(앱·추천·임베딩·푸시 불변). 기존 비밀번호·키·환경변수 절대 변경 금지, 새 키 추가는 가능. `DATABASE_URL` 로컬 미보관. 기록: [[anyang-deployment-portability]].
    - 설계 요구(메인 세션, 제안값은 `(미확정)`): A 보드 수집기(Node 20, collector.ts 파서 재사용 방식, quick 10분·full 하루 1회·수동 backfill, systemd timer/cron 택일, 설치 경로, 로그, 2초 간격, `COLLECTOR_CONTACT`, 차단 페이지·0건은 성공 아님). B 보드 DB(새 DB 예 `anyang_collector`, USB 테이블스페이스와 미마운트 시 동작, 원문 HTML·정리 값·`sync_status` pending/synced/failed·재시도·last_error, 로컬 소켓 peer 인증, 기존 DB·서비스 무영향). C Vercel 받기 API(예 `POST /api/ingest/notices`, 새 키 하나 — 이름 제안·`BACKFILL_SECRET` 재사용 판단, `source_url` 배치 upsert, 해시 변경 시 청크 삭제·재임베딩, 시간 예산 임베딩, 항목별 결과, 남은 임베딩은 보드가 `/api/jobs/embed` 호출, 본문·첨부·is_pinned·image_count 규칙은 기존 승인값). D 서버 측(Vercel 직접 수집·pg_cron 수집 잡을 운영 경로에서 빼는 방식, 서버 수집기도 차단 페이지·0건을 실패로 기록, 시험 호출 success 0건 1행 처리). E 결정 문서 갱신(pm 완료). F 테스트 방법, 보드 배포 절차(기존 서비스 무중단), 롤백, 장애 영향.
    - 진행: `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 승인된 설계에서 뺐다(22차). 설계 database → backend → (필요하면) frontend draft. 이번 호출은 설계만 — 코드·보드 변경·배포 없음.
    - **설계 draft 완료(2026-10-04)**: database 새 문서 [[anyang-board-collector-db]](보드 DB `anyang_collector`, `collected_notices`(원문 HTML·정리 값·`sync_status`·`retry_count`·`last_error`·백오프 10분×2^n·상한 5), `collector_runs`, 롤 `anyang_collector`·OS 사용자 `arduino`, 로컬 소켓, 폴더 `/mnt/usb/anyang-collector/pg`, 마이그레이션 `web/collector/db/0001_init`, 시험은 보드 임시 클러스터) + [[anyang-database-schema]] 56 단락(수집 pg_cron 잡 등록 안 함 — Supabase에 pg_cron 미설치·잡 없음 확인, `collect_runs` 호출당 1행·mode 컬럼 불필요). backend 새 문서 [[anyang-board-collector]](파서 `web/lib/notice-parser.ts` 분리 공유, 보드 소스 `web/collector/` → esbuild 단일 파일 → scp, systemd timer(quick 매시 03·13…53분, full 서울 04:00, backfill 수동), 코드 `/home/arduino/anyang-collector/`, 설정 `/etc/anyang-collector/collector.env`(root 0600), 차단 페이지·첫 목록 0건 failed + 차단 시 60분 쉼, `POST /api/ingest/notices` 최대 20건·항목별 created/updated/unchanged/rejected/error·입력 검증·해시 재계산·200초 임베딩·`remaining_unembedded`, 새 키 `COLLECTOR_INGEST_SECRET`(헤더 `x-collector-secret`, `BACKFILL_SECRET` 재사용 안 함), 직접 수집은 `DIRECT_COLLECT_ENABLED` 스위치(없으면 꺼짐, 410 `DIRECT_COLLECT_DISABLED`)·서버 수집기 차단·0건 failed 보강, 보드 `collected_at` 미전송) + backend-api 포인터, backend-tasks 5-6~5-9. frontend [[anyang-frontend-screens]] 11절 "56 개정"·[[anyang-frontend-tasks]] K1(수동 수집 410이면 안내·이후 비활성, 이력 표 `describeRun` 문구 매핑, `/notices` 변경 없음). 재승인 대기.
    - 사용자 결정 필요:
      - (a) **보드 DB 구성안**: A안 = 기존 클러스터 + USB 테이블스페이스(지시서 기본) — USB 오류 시 PostgreSQL이 fsync 실패로 PANIC → 기존 DB까지 재시작될 수 있음(일반 동작 설명, 보드 재현 안 함). B안 = USB에 별도 클러스터 — 그 위험 없음, 별도 pg_hba로 peer 인증 가능, 프로세스 하나 추가. database 권고 B.
      - (b) 직접 수집 경로: 스위치로 닫기(권장) / 그대로 / 삭제(승인 대상).
      - (c) 시험 호출이 남긴 `collect_runs` success 0건 1행: database 권고 failed로 갱신 + `error_summary` `ip_blocked`(삭제·그대로도 비교, 모두 운영 쓰기라 승인 필요).
      - (d) 새 환경변수 `COLLECTOR_INGEST_SECRET` — 사용자가 값을 만들어 Vercel과 보드 `/etc/anyang-collector/collector.env`에 직접 입력(에이전트는 값을 보지 않음). `COLLECTOR_CONTACT` 실제 값.
      - (e) `esbuild` devDependency 추가.
      - (f) 기존 `/mnt/usb/postgresql`(2026-08-01 미사용 데이터 디렉터리 복사본 71MB)·`/mnt/usb/data`(빈 폴더)의 용도 — 건드리지 않고 새 폴더를 쓰는 안.
      - (g) 제안값 전부 `(미확정)`: 상태 전이·백오프·상한 5·90일 보존·raw_html 정책, systemd timer·03분 오프셋·`MemoryMax` 300M·60분 쉼·배치 20건, 화면 안내 문구·코드 문구 5종.
    - 확인 필요(구현·시험 단계): 안양시가 보드 IP도 차단하는지(시험 ① dry-run), 보드 → Vercel POST가 배포 보호에 막히는지(시험 ③, 루트 GET은 307), 실패 행 `error_summary` 정확한 형식(frontend 질문 — 정해지면 종류 표시 추가), 스위치 상태 조회 API 필요 여부(frontend, 이번 안은 불필요).
    - 범위 밖 참고(backend): 백필로 462건이 `collected_at=now()`로 한꺼번에 들어가면, 알림 잡 등록 후 `collected_at > enabled_at` 조건 때문에 과거 공지가 일괄 발송될 수 있다. 알림 잡 등록 전에 확인.
    - 보안 참고(database 읽기 전용 확인, 보드 기존 설정 — 변경하지 않음): 보드 `pg_hba.conf`가 local·127.0.0.1·::1 모두 `trust`라 보드의 모든 OS 사용자가 비밀번호 없이 기존 DB에도 슈퍼유저로 접속할 수 있다. 이전 psql 기록 파일에 비밀번호 문자열이 남아 있다(문서에 옮기지 않음). 조치 여부는 사용자 판단.
    - **사용자 결정·승인(2026-10-04, user, 메인 세션 전달)**: (a) B안 — USB에 별도 PostgreSQL 클러스터, 기존 클러스터·DB 불변. (b) `DIRECT_COLLECT_ENABLED` 스위치로 닫음(코드 삭제 없음). (c) 시험 호출 `collect_runs` 1행을 failed·`error_summary` `ip_blocked`로 수정(운영 쓰기 승인). (d) `COLLECTOR_INGEST_SECRET`은 메인 세션이 생성해 Vercel production(sensitive)·`web/.env.local`에 둠 — 값 출력·기록 금지, 보드 `/etc/anyang-collector/collector.env`(root 0600)에는 `.env.local`에서 읽어 ssh로 직접 기록, `COLLECTOR_CONTACT`는 비워 둠. (e) esbuild devDependency 승인. (f) `/mnt/usb/postgresql`·`/mnt/usb/data` 건드리지 않음. (g) 제안값 전부 확정. 설계 7종 "제안대로 승인". 보드 보안(pg_hba trust, psql 기록 비밀번호 문자열)은 범위 밖 — 그대로 두고 아래 (h)로 남김. 알림 잡은 등록하지 않음.
      - 진행 순서(승인): (미확정) 정리 → 23차 → 구현(파서 분리, 받기 API, 스위치, 차단 판정, 보드 수집기 번들, frontend 410 안내) → test·build → code-review → 커밋 → push → `vercel deploy --prod` → (c) → 보드 설치(무중단, 설치 전후 systemctl·ss 비교) → 시험 ① dry-run → ③ 실제 POST 1~2페이지·Supabase 확인 → backfill 1~47 → 462건·청크 없는 공지 0 → timer 활성화. 단계 실패 시 멈춤.
    - **구현(2026-10-04)**: database `6581771`(보드 DB `web/collector/db/0001_init` up/down, `setup-cluster.sh`, `postgresql@17-collector` USB 드롭인; 로컬에 psql 없어 SQL 실행 검증 못 함), backend `791fd53`(파서 `notice-parser.ts`·저장 분리, 서버 수집기 차단·0건 failed)·`6d884df`(`POST /api/ingest/notices`, `DIRECT_COLLECT_ENABLED` 스위치)·`bea3372`(보드 수집기 `web/collector/`, systemd 유닛 3개, esbuild 번들 `npm run build:collector` → `web/dist-collector/anyang-collector.mjs` 약 2.4MB, 커밋 대상 아님), frontend `9b189a1`(관리자 410 안내·이력 문구). code-review: 치명 0, 주요 1, 경미 9 → 구현 수정 재위임 1회 backend `fdbe36a`(보드 DB 오류는 Vercel 보고 없이 `unexpected`, null 응답 항목만 재시도 `bad_item`, 유닛 의존 순서·`Requires=postgresql@17-collector`, content-length 선검사 413) → 재검수 치명·주요 0, 경미 1. npm test 382·build 통과. **push·배포·보드 설치는 아래 설계 변경 결정 뒤로 멈춤.**
    - (j) **사용자 결정 필요 — 설계 변경(code-review)**: 
      - ① (주요) full 성공 보고: 설계 A-4 6번 "full은 성공·실패 모두 보고"와 C-2(`report.status`는 failed만)·C-4 3번(항목·report 없으면 400)이 충돌. 구현은 실패 때만 보고 → 새 글 없는 날은 `collect_runs`에 행이 없어 "하루 1행 살아 있음 신호"가 없다. 선택: (가) 설계를 "실패 때만 보고"로 고침(코드 그대로) (나) `report.status`에 success 허용 + success 행 기록(backend 코드 수정). pm 권장 (나) — 관리자가 보드 정상 동작을 매일 확인할 수 있음. 
      - ② 설계 표에 없는 값을 구현이 씀: `ip_blocked_skipped`(차단 중 60분 쉬는 실행 — 이게 없으면 쉬기가 풀림), `unexpected`(보드 DB 오류 등), `bad_item`(응답 항목 형식 불일치), `ingest_unavailable`, `ingest_bad_request`. 설계는 코드 값을 구현에 위임했지만 표에 빠짐 → 문서에 추가(backend·database 문서).
      - ③ C-2 응답표 문구 "필드 누락 등 요청 전체 형식 오류 → 400"을 구현(필드 오류는 항목별 rejected `INVALID_FIELD`, 최상위 형식만 400, C-3과 일치)에 맞게 정리.
      - ④ `collector.env` 변수 목록(A-3)에 `PGPORT=5433` 추가(없으면 기존 main 5432에 붙을 수 있어 구현이 막음, `.env.example`에는 있음).
      - ⑤ 보드 `collector_runs` 90일 삭제 쿼리 미구현 — 삭제라 승인 대상. 승인하면 backend 구현.
      - 그래서 `anyang-board-collector`·`anyang-board-collector-db`를 승인된 설계에서 뺐다(23차 이후). 결정 뒤 backend·database가 문서 반영 → 24차 → (나)면 backend 수정·재검수 → push → 배포 → (c) → 보드 설치 → 시험.
    - **(j) 결정(2026-10-04, user, 메인 세션 전달)**: ① (나) — full은 성공·실패 모두 보고, 매일 1행 기록(backend 수정·재검수). ②③④ 코드 값 5종 표 추가, 응답표 문구 정리, `collector.env`에 `PGPORT=5433` — 문서만 코드에 맞춤, 승인. ⑤ 보드 `collector_runs` 90일 자동 삭제 승인(실행 기록만, `collected_notices` 원문은 지우지 않음). 이어서 24차 → backend 수정·재검수 → push → deploy → (c) → 보드 설치 → 시험 ①·③ → backfill → 462건 → timer.
    - (j) 구현(2026-10-04): backend `6f0608d`(success 보고 허용·full 일일 보고·collector_runs 90일 삭제, test 386·build·build:collector 통과). code-review 재검수: 직전 5건 해소, 치명·주요 0. 경미 문서 2건(다음 문서 수정 때, 설계 잠금이라 지금 안 고침): [[anyang-board-collector-db]] 164행 "삭제 구현은 아직 없다"가 낡음, [[anyang-board-collector]] 204~206행 응답표가 문단에 끊겨 413·500 행이 표 밖으로 렌더링.
    - **push·배포(2026-10-04)**: 기록 커밋 `3fc656c`, push `71a138d..3fc656c`(원격 일치). **`vercel deploy --prod`가 "Not authorized"(deploy_failed)로 실패해 멈춤** — `vercel whoami`는 로그인 상태, `.vercel/project.json`은 projectName `web`·팀 org에 연결. 원인 미확인(팀 배포 권한·토큰 범위 추정). 배포 ID 없음. (c) 운영 DB 수정, 보드 설치, 시험은 진행하지 않음. 사용자가 Vercel 권한·로그인을 확인하거나 직접 배포한 뒤 pm 재호출.
      - 배포 완료(2026-10-04, 메인 세션): `web/`에서 `vercel deploy --prod --yes` 재실행 성공(앞선 Not authorized는 일시적 오류로 봄). HEAD `d1c21a0`(코드는 `3fc656c`와 같음), 미커밋 변경 없음. `web-62gj53c2b-whwlgns42-1220s-projects.vercel.app` production Ready, 별칭 `web-beta-smoky-16.vercel.app`. 키 없이 `POST /api/ingest/notices` 401 — 받기 API 운영 반영.
    - (c) 완료(2026-10-04, database, 운영 Supabase): `collect_runs` 전체 1행(id `68023809-1be2-45fe-9dbf-510e3f781b78`, trigger_type scheduled, started_at 2026-10-03 18:19 UTC)을 status success → failed, error_summary null → `ip_blocked`. 다른 컬럼 그대로, 갱신 1행.
    - (l) **설계 변경 필요(2026-10-04, database — 보드 설치 직전 멈춤)**: 설계 B-1·B-4는 새 클러스터를 OS 사용자 `arduino`로 실행하고 소켓을 `/var/run/postgresql`에 두는데, 보드에서 이 폴더는 `postgres:postgres` 2775이고 `arduino`는 `postgres` 그룹이 아니라 쓸 수 없다(`test -w` 실패). 그대로 실행하면 `.s.PGSQL.5433`을 못 만들어 기동이 실패한다(main 영향은 없음). 보드 변경 없음(SSH 읽기만, 설치 전 스냅샷: 실행 중 서비스 34개, 5433 미사용, `pg_lsclusters` main만, main 설정 파일 해시 기록, available 2809MB). 선택지: (a) `arduino`를 `postgres` 그룹에 추가 — 설계 그대로지만 설계 밖 사용자 권한 변경·재로그인 필요 (b) 소켓 폴더를 새 위치로(유닛 `RuntimeDirectory`) — 수집기 접속 문자열까지 바뀜(board-collector-db B-1·B-4·F-1 + [[anyang-board-collector]]) (c) 클러스터 OS 사용자를 `postgres`로(`pg_createcluster -u postgres`) — 수집기(`arduino`)는 pg_ident 맵(`arduino`→`anyang_collector`)으로 그대로 peer 접속, 관리 행은 `local all postgres peer`, 관리는 `sudo -u postgres psql -p 5433`, 새 OS 사용자 없음, 소켓·접속 문자열 불변, 바뀌는 곳은 B-1(실행 사용자·데이터 폴더 소유자)·B-4·`setup-cluster.sh`. database 권장 (c)(가장 작은 변경), pm도 (c) 권장. 그래서 `anyang-board-collector-db`를 승인된 설계에서 뺐다(24차 이후). 결정 뒤 database 설계 반영 → 25차 → setup-cluster.sh 수정·재검수 → 보드 설치부터 재개.
    - **(l) 결정(2026-10-04, user, 메인 세션 전달)**: (c) — 클러스터 OS 사용자 `postgres`(`pg_createcluster -u postgres`), 수집기(`arduino`)는 pg_ident 맵(`arduino`→`anyang_collector`) peer, 관리 접속 `sudo -u postgres psql -p 5433`, 소켓 위치·접속 문자열 불변, 기존 권한 확장 없음. 변경 범위 B-1·B-4·`setup-cluster.sh`로 승인. 이어서 25차 → 스크립트 수정 → code-review → 커밋 → 보드 설치(전후 비교, main 설정 해시 불변) → 시험 ①·③ → backfill → 462건 → timer.
    - **(l) 구현·보드 설치·운영 시작(2026-10-04)**:
      - database `d1f34d1`(setup-cluster.sh (c)안, 설계 25차 반영) → code-review 경미 4 → `cc5208c`(pg_lsclusters 가드, 로케일 `en_US.UTF-8` 고정 — main template1과 같음, 포트 5433·ext4 사전 점검, 정리 절차 주석; 보드 `postgresql@.service`에 [Install] 있음 확인) → 재검수 치명·주요 0(경미: 27행 `ss|grep -q` pipefail — 설치 때 별도 확인으로 대신).
      - 보드 DB 설치(database): 클러스터 `17 collector` active·enabled, 소켓 `/var/run/postgresql/.s.PGSQL.5433`만(TCP 없음), 테이블 3개 소유자 `anyang_collector`, 0001 기록. 접속 시험: arduino→anyang_collector 성공, nobody·arduino→postgres·다른 DB 거부. 전후 비교: 실행 중 서비스 34→35(collector만 추가), 리스닝 포트 동일, main 설정 3개 sha256 불변, 5432 그대로, `/mnt/usb/postgresql`·`/mnt/usb/data` mtime 불변, collector RSS 약 61MB. 보드 임시 파일 `/tmp/anyang-setup/`(삭제 안 함).
      - 보드 수집기 설치(backend): 번들 sha256 `4947669dd8e76d27845520638dd0b7f77a5f1b31acb7f1a1e4e5dd90b1f0058e` → `/home/arduino/anyang-collector/anyang-collector.mjs`, `/etc/anyang-collector/collector.env`(root 0600, 키는 `.env.local`에서 파이프로 기록·비노출, `COLLECTOR_CONTACT` 미기재), 유닛 3개(LF). 시험 ① dry-run: 보드 IP 차단 없음(items 10). 시험 ③: 1차 `ingest_bad_request` — pm 지시서가 `COLLECTOR_INGEST_URL`에 전체 경로를 적었는데 수집기는 **기준 주소**에 경로를 붙임 → 기준 주소 `https://web-beta-smoky-16.vercel.app`로 고쳐 2차 성공(20건 synced). Supabase 20건·청크 없는 공지 0 확인(database).
      - 전체 백필(backend, `systemd-run` 자원 상한 동일): 10:45~11:17 KST 약 32분(수집 20분 + sync 23배치), 차단 없음. 보드 `collected_notices` 462 전부 synced. `/api/jobs/embed` 3회 모두 처리 0.
      - **운영 Supabase 확인(database, 읽기 전용)**: notices **462건**(hidden 0, source_url 중복 0, content_hash 중복 0), notice_chunks 468행·**청크 없는 공지 0**, is_pinned 0, image_count>0 76, attachments 있음 102, published_at null 0(2021-06-02~2026-10-01), collect_runs 받기 API 행 success.
      - 타이머 활성화(backend): quick·full enabled·active, 보드 시간대 Asia/Seoul, quick 다음 실행 매시 x3분, full 2026-10-05 04:00 KST. quick 1회 11:23 성공(found 10, new 0 — 보고 없음, 설계대로). 기존 서비스·포트 그대로.
      - 보드 변경 목록: 클러스터 `17 collector`(데이터 `/mnt/usb/anyang-collector/pg`, 설정 `/etc/postgresql/17/collector/`, 로그 `/var/log/postgresql/postgresql-17-collector.log`, 드롭인 `/etc/systemd/system/postgresql@17-collector.service.d/usb.conf`), 롤·DB `anyang_collector`, `/home/arduino/anyang-collector/`, `/etc/anyang-collector/collector.env`, `/etc/systemd/system/anyang-collector@.service`·`anyang-collector-quick.timer`·`anyang-collector-full.timer`.
      - 롤백: 승인 없이 가능 — `sudo systemctl disable --now anyang-collector-quick.timer anyang-collector-full.timer`, `sudo systemctl disable --now postgresql@17-collector`. 제거(사용자 승인 대상) — `pg_dropcluster 17 collector`, 드롭인·유닛·설정·`/home/arduino/anyang-collector`·`/mnt/usb/anyang-collector` 삭제 후 `daemon-reload`. Supabase 462건은 정상 데이터라 롤백 대상 아님.
    - (m) 후속(차단 아님): ① 첫 full(2026-10-05 04:00 KST) 결과와 Supabase `collect_runs` success 1행 확인 ② [[anyang-board-collector]] A-3에 `COLLECTOR_INGEST_URL`은 기준 주소(경로 없이)라는 예시 보강(설계 잠금, 다음 수정 때) ③ Windows 작업 트리의 셸·유닛 파일이 CRLF로 체크아웃됨 — 보드 복사 시 LF 변환이 필요했다. `web/collector/` 아래 `*.sh`·유닛 파일에 `.gitattributes`(eol=lf) 추가 검토 ④ is_pinned 0건 — 55-b(고정 공지 실측) 그대로 ⑤ 보드 `systemctl --failed`에 arduino SSH 세션 scope 2개(작업 전 상태 미확인, 무관해 보임) ⑥ 보드 `/tmp/anyang-setup/` 임시 파일 남음.
    - **완료 확인·결정(2026-10-04, user, 메인 세션 전달)**: 메인 세션이 56 완료 확인(notices 462, 미임베딩 0, quick·full 타이머 활성, 보드 기존 서비스 active). ① 로컬 5커밋은 push하지 않는다("나중에"). ② `BACKFILL_SECRET` 삭제 — 메인 세션이 Vercel production과 `web/.env.local`에서 지움. `COLLECTOR_INGEST_SECRET`과 기존 키는 그대로. 다음 배포부터 서버 backfill 모드는 키가 없어 비활성(401). 알림 잡(56(i))은 별도 작업으로 남김.
    - (k) 경미(검수 기록, 조치 불필요): 같은 새 글이 동시에 두 번 들어오면 두 번째 처리에서 청크 삭제가 빠질 수 있으나 보드 락이 단일 실행을 보장해 사실상 발생하지 않음(`lib/notice-store.ts:24-53`).
    - (h) **보드 보안(사용자 판단 대기, 이번 범위 밖)**: 보드 `pg_hba.conf` local·127.0.0.1·::1 trust, 이전 psql 기록 파일에 비밀번호 문자열 잔존. 변경하지 않음.
    - (i) **알림 잡 등록 전 확인 필요**: 백필 462건이 `collected_at=now()`로 들어가 알림 잡 등록 후 과거 공지가 일괄 발송될 위험.
    - 역링크 남음(WARN): [[anyang-board-collector]] ← [[anyang-frontend-tasks]](backend 소유), [[anyang-database-schema]] ← [[anyang-board-collector]](database 소유). 다음 수정 때.
57. **설계(2026-10-04, 새 요청 — 56(i) 알림 잡 활성화, 사용자 "진행해")**: 사용자별 알림 시각에 새 공지 푸시가 실제로 나가게 한다. 과거 공지(백필 462건)는 일괄 발송하지 않는다. 제약(계속 유효): 기존 비밀번호·키·환경변수(`SCHEDULER_SHARED_SECRET` 포함) 변경 금지·새 키 추가 가능, `DATABASE_URL` 로컬 미보관, 안양시 수집은 보드만(Vercel·Supabase가 Vercel 자기 API를 부르는 것은 차단과 무관).
    - 설계 요구: A 과거 공지 일괄 발송 방지(현재 조건 실측 검토, 대안 비교 — 백필분 발송 완료 표시/published_at 상한/알림 컷오프 등, 권장안 1개, 운영 데이터 변경이면 대상 행 수·롤백). B 트리거(값을 모르는 `SCHEDULER_SHARED_SECRET` 조건에서 5분 주기 — (1) pg_cron + pg_net + 새 키(Vault) (2) 보드 timer + 새 키 또는 `COLLECTOR_INGEST_SECRET` (3) 기타; 가동률·보안·변경 범위 비교, 권장안, 키 분리 원칙). C 첫 활성화(테스트 계정 1개 검증, 사용자 수·알림 설정 수 읽기 전용 실측, 롤백). D 사용자 결정·(미확정) 목록.
    - 진행: `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 승인된 설계에서 뺐다(26차). 설계 database → backend → (필요하면) frontend draft. 코드·운영 변경·잡 등록 없음.
    - **실측(2026-10-04, database, 운영 Supabase 읽기 전용, 건수만)**: users 4(정지 0), `notify_settings` 0행(알림 켠 사용자 없음), `push_subscriptions` 0, `notify_logs` 0, `user_preferences` 7행/2명, notices 462 전부 백필 구간(01:43:52~02:17:42 UTC), published_at 최근 7일 2건·30일 5건, `supabase_vault` 0.3.1 설치(secrets 0), `pg_cron` 1.6.4 설치 가능·미설치, `pg_net` 설치.
    - **설계 draft 완료(2026-10-04)**: database [[anyang-database-schema]] "알림 잡 활성화 — DB 몫" 절, backend [[anyang-backend-api]] 7-1절·7·9절·테스트 방법, [[anyang-backend-tasks]] 18(18-1~18-4). frontend 영향 없음(API 계약 불변, 기존 알림 설정 화면 사용). 두 문서 사이 어긋남 없음.
      - A 권장 (나): 기존 `collected_at > enabled_at`은 그대로 두고 후보 쿼리(`web/app/api/jobs/notify/route.ts` 한 곳)에 `coalesce(published_at, collected_at) >= now() - 14일`(N 미확정)을 더한다. 지금은 알림 켠 사용자가 0명이라 앞으로 켜는 사용자의 `enabled_at`이 백필보다 뒤여서 백필 462건은 이미 막히지만, 남는 틈 두 가지(본문 수정된 옛 글은 `collected_at`이 now로 바뀜, 보드가 처음 수집하는 옛 글)를 막는다. 운영 데이터 변경 없음, 롤백은 코드 되돌리기. 비교: (가) 백필분 `notify_logs` 사전 기록은 4명×462=1,848행이고 미래 가입자를 못 덮음, (다) 컷오프는 `enabled_at` 규칙과 중복. 비용: 보드가 14일 넘게 멈췄다 복구되면 그 사이 글은 푸시 안 됨.
      - B 권장 (1) pg_cron + pg_net + 새 키: 환경변수 `NOTIFY_TRIGGER_SECRET`, 헤더 `x-notify-secret`, Vault `notify_trigger_secret`·`app_base_url`, 잡 `notify-job-trigger` `*/5 * * * *`, pg_net 타임아웃 30초. Vault에서 읽어 `cron.job.command`에 키가 남지 않음. 인증은 notify 라우트만 `requireNotifyJobSecret`(scheduler 키 또는 새 키), 다른 라우트는 새 키 불허, 기존 `x-scheduler-secret` 경로 유지. 이유: 알림은 5분 창이라 놓친 실행은 복구 안 됨 — Supabase·Vercel에만 의존하는 (1)이 보드 전원·회선에도 의존하는 (2)보다 낫다. `COLLECTOR_INGEST_SECRET` 재사용은 비권장(공지 쓰기·임베딩 권한과 겹침). Vercel Cron은 Hobby 하루 1회라 불가(기존 결정).
      - C 첫 활성화: 사전 점검(알림 켠 사용자 0 재확인, Vercel `VAPID_*` 이름만 확인) → 코드 배포 → database 잡 등록 → 테스트 계정(앱에서 푸시 구독·알림 켜기, 선호 보유) → 확인. 새 공지를 기다리지 않으려면 database가 그 계정이 받을 공지 수를 읽기 전용으로 세어 1건 이상이면 그 계정 `enabled_at`만 백필 이전으로 당김(운영 1행, 롤백은 원래 값), 0건이면 새 공지 대기. 운영에서 푸시 실제 전달은 아직 확인된 적 없음. 롤백: `cron.alter_job(active:=false)`/`cron.unschedule`, 새 키 삭제 후 재배포, 코드 되돌리기.
      - 추가 수정 제안: 구독 0개 사용자는 성공 0·실패 0이면 `failed`로 남기지 않고 `pending` 선점 행을 지움(나중에 구독하면 다시 대상). notify 라우트에 `maxDuration` 없음 → 60초(미확정) 추가([[anyang-jobs-collect-missing-maxduration]]와 같은 유형).
    - 사용자 결정 필요(D): ① A (나) 채택과 N일(제안 14) ② B pg_cron + pg_net 채택, 주기 5분 ③ 새 키 이름(`NOTIFY_TRIGGER_SECRET`·`x-notify-secret`), 값 생성·Vercel·Vault 입력(사용자 또는 메인 세션 — 값 비노출, `SCHEDULER_SHARED_SECRET` 불변) ④ `maxDuration` 60초, pg_net 타임아웃 30초 ⑤ 구독 0개 처리 방식 ⑥ 테스트 방법(사전 조회 후 `enabled_at` 당기기 또는 새 공지 대기, 운영 1행 변경 허용 여부) ⑦ 운영 작업 승인: `pg_cron` 확장 설치, Vault 2건, 잡 등록, 코드 배포, Vercel 환경변수 추가 ⑧ 보드 14일 이상 정지 시 그 사이 글 미발송 수용 여부.
    - **사용자 결정·승인(2026-10-04, user, 메인 세션 전달)**: ① (나) 채택, 상한 14일 ② pg_cron + pg_net, `*/5` ③ `NOTIFY_TRIGGER_SECRET`·`x-notify-secret`·Vault `notify_trigger_secret` 확정 — 메인 세션이 값을 만들어 Vercel production(sensitive)·`web/.env.local`에 넣음, Vault에는 활성화 때 database가 `.env.local`에서 읽어 MCP로 넣음, 값은 문서·로그·보고·커밋에 남기지 않음, `SCHEDULER_SHARED_SECRET`·기존 키 불변 ④ `maxDuration` 60초, pg_net 타임아웃 30초 ⑤ 구독 0개 사용자 pending 삭제 승인 ⑥ 테스트는 테스트 계정 1명의 `enabled_at`만 당김(운영 1행 변경 승인), 앱 구독·알림 켜기는 사용자가 직접 — 그 단계에서 멈추고 사용자 할 일 보고 ⑦ 운영 작업(pg_cron 설치, Vault 2건, 잡 등록, 코드 배포) 승인, 환경변수 추가는 완료 ⑧ 보드 14일 이상 정지 기간 글 미알림 수용. 순서: (미확정) 정리 → 27차 → 구현·test·build → code-review → 커밋 → push → deploy(Not authorized면 1회 재시도) → 사전 점검(알림 켠 사용자 0) → pg_cron·Vault·잡 → 첫 실행 응답·`cron.job_run_details` → 테스트 계정 단계에서 멈춤.
    - **구현(2026-10-04)**: backend `c4c0174`(notify 후보 쿼리 14일 상한·`make_interval(days => $3)`, 구독 0개·전부 만료면 pending 삭제, `maxDuration = 60`, `requireNotifyJobSecret` — notify만 `x-notify-secret` 허용, `.env.example`), code-review 치명 0·주요 1(database 문서 57 절 `(미확정)` 미제거)·경미 → backend `1f47753`(테스트 env 복원, 0.75 주석 "설계 승인값", 일부 성공·전부 실패 시 삭제 미호출 테스트), database `2e8d8f3`(db 문서 status active·`(미확정)` 제거) → 재검수 치명·주요 0. npm test 398·build 통과.
      - 후속(문서, 설계 잠금이라 다음 설계 수정 때): [[anyang-database-schema]] 57 절에 빈 백틱 4곳, "설계 draft"·"이 절의 값은 모두 (미확정)"·"backend 확정 전 가칭"·"권장안" 등 승인 전 어휘 잔존, Links 역링크 2건(`anyang-supabase-connection`, `anyang-user-name-memory`). [[anyang-backend-api]] 61행 "재승인 대기", 1859행 "확정 전 모든 값이 제안" 잔존 — 두 문서 링크 제목은 함께 고쳐야 깨지지 않음. 알림 처리가 직렬이라 같은 시각 사용자가 수십 명을 넘으면 `maxDuration` 60초 초과 가능(설계 7-1에 적힌 위험) — 그때 분할·병렬 설계 변경 검토.
    - **push·배포·활성화(2026-10-04)**: 기록 커밋 `4950b33`, push `3fc656c..4950b33`(원격 일치). backend `vercel deploy --prod` 1회 성공(`dpl_4TvY5kFoW1JGxUt896z8wfLZXZvt`, 별칭 `web-beta-smoky-16.vercel.app`), `/login` 200, notify 키 없음·틀린 `x-notify-secret` 모두 401, 15분 error 로그 없음. database: 사전 점검(알림 켠 사용자 0, 구독 0, notify_logs 0, cron 스키마 없음) → `pg_cron` 1.6.4 설치 → Vault `notify_trigger_secret`(길이 64, `.env.local` 값과 일치 — 값 비노출)·`app_base_url` → 잡 `notify-job-trigger` jobid 1 `*/5 * * * *` active(command에 키 문자열 없음 확인) → 첫 실행 03:00 UTC `succeeded`, `net._http_response` 200 `{"sent_count":0}`(타임아웃·오류 없음), notify_logs 0 그대로. VAPID 3개는 2026-09-28 운영 등록 기록만 있고 이번에 이름 재확인은 안 함.
      - 롤백: `select cron.alter_job((select jobid from cron.job where jobname='notify-job-trigger'), active := false);`(일시 중지) / `select cron.unschedule('notify-job-trigger');` / Vault 2건 삭제 / `drop extension pg_cron`(다른 잡 없을 때만).
      - **테스트 계정 단계에서 멈춤(사용자 할 일)**: 선호(기억)가 있는 계정(현재 2명) 중 하나로 운영 앱 `/settings/notifications`에서 브라우저 알림 허용(푸시 구독) → 알림 켜기 → 알림 시각을 지금 + 약 15분(서울 시각)으로 저장. iPhone은 홈 화면에 앱을 추가한 PWA에서만 웹 푸시가 된다. 끝나면 pm 재호출 → database가 그 계정이 받을 공지 수를 읽기 전용으로 세고(14일 상한·유사도 0.75 — 이후 57(n)으로 0.70), 1건 이상이면 그 계정 `enabled_at`만 백필 이전으로 당김(승인된 운영 1행) → 알림 시각 창에서 발송·`notify_logs` success·기기 수신·`/notices/[id]` 이동 확인. 0건이면 새 공지 대기로 하고 "cron → 라우트 → 200"까지만 확인한 것으로 기록.
    - 확인 못 함: pg_net이 30초에 끊었을 때 Vercel 함수가 끝까지 도는지(끊겨 `pending`이 남으면 다음 날 창에서 다시 선점돼 하루 늦게 발송 — 첫 실행 응답 시간으로 확인), Supabase 무료 프로젝트 일시중지 정책 적용 여부, 운영 Vercel `VAPID_*` 3개 존재, 개발용 Supabase 프로젝트 존재.
    - **테스트 결과(2026-10-04, 메인 세션 실측)**: 테스트 계정(user `2646968e…`)이 알림을 켬 — notify_time 12:06, enabled_at 12:04 KST, 구독 1, 선호 6. 12:00·12:05 cron 200 `{"sent_count":0}`. 이 계정 선호(최근 5개 평균)와 14일 이내 공지 3건의 최대 유사도 0.728(일자리 박람회)·0.726(역량강화 특강)·0.633 — 모두 임계값 0.75 미만이라 `enabled_at`을 당겨도 0건 → 당기지 않음(운영 데이터 무변경). 푸시 실제 전달은 아직 미확인.
    - (n) **확인 필요(사용자 판단, 이번엔 바꾸지 않음)**: 유사도 임계값 0.75가 실제로는 거의 발송되지 않는 수준일 수 있다(테스트 계정 최댓값 0.728). 바꾸면 설계 변경(backend-api 7절).
    - 갱신(2026-10-04): 58 테스트 알림으로 운영 웹 푸시 실제 전달이 확인됐다(사용자 실기기 수신). 알림 잡 경로 중 남은 미확인은 공지 매칭 발송뿐이며, 현재 임계값 0.75로는 테스트 계정 대상 공지가 0건이다. (n)은 사용자 결정 전이라 열린 항목 그대로.
    - **(n) 결정(2026-10-04, user "좀 낮춰줘", 메인 세션이 0.70 제안·전달)**: 알림 매칭 유사도 임계값 0.75 → **0.70**. 범위는 `web/app/api/jobs/notify/route.ts` `SIMILARITY_THRESHOLD`와 그 값을 적은 설계 문서(backend-api 7절 등, database-schema)뿐. 추천 정렬·다른 값 불변, 운영 데이터 불변. 실측(메인 세션): 테스트 계정 최근 14일 공지 최대 유사도 0.728·0.726 → 0.70이면 2건이 매칭 대상이나 `enabled_at`(12:04) 이후 수집된 공지가 0건이라 당장 발송은 없음. 그래서 `anyang-database-schema`·`anyang-backend-api`를 승인된 설계에서 뺐다(29차 전 단계). overview 문서(`AI-Sessions/wiki/overview/` html·json)에도 0.75가 있으나 overview는 요청 시에만 갱신 — "overview 최신화 필요".
      - 구현(2026-10-04): database·backend 설계 반영 → 29차 → backend `110476c`(`SIMILARITY_THRESHOLD` 0.70, `web/`에 다른 임계값 0.75 없음 확인) → code-review 치명·주요 0(유사도 = 1 − 거리, `>=` 비교 방향 정상, 범위 밖 코드 변경 없음). npm test 418·build 통과. 같은 커밋에 backend-api 8-1절 제약 확인 사실 정정이 함께 들어감(무해).
      - push·배포(2026-10-04): 기록 커밋 `63efbb8`, push `30a22f7..63efbb8`. `vercel deploy --prod` 1회 성공(`dpl_GV9awVuyYt9jSszXvq1DDhFNiaCa`, 12:45 KST, 별칭 `web-beta-smoky-16.vercel.app`). `/login` 200, notify 키 없이 401, 배포 후 error 없음.
      - (o) 확인 필요(차단 아님): 배포 전(이전 배포) 12:35:52 KST에 `POST /api/notify-settings/test` error 로그 1건. 원인 미조사(사용자 실기기 수신은 성공 보고). backend가 로그 내용 확인 필요.
58. **새 요청(2026-10-04, user, 메인 세션 전달 — 테스트 알림 버튼, 사용자가 승인한 범위로 설계·구현, 재승인 없음)**:
    - backend: `POST /api/notify-settings/test` — 로그인 세션 인증, 본인 `push_subscriptions`에만 발송, payload 제목 "테스트 알림입니다"·누르면 `/settings/notifications`, 410·404 구독은 기존 규칙대로 삭제, `notify_logs` 미기록, 사용자당 1분 1회 제한(429), 응답 `{success_count, failed_count}`, 구독 0이면 409 `NO_SUBSCRIPTION`, 정지 사용자는 기존 정지 규칙.
    - frontend: 알림 설정 화면에 "테스트 알림 보내기" 버튼, 결과 안내 3가지(성공 n대 / 구독 없음 / 잠시 후 다시 시도), 기존 화면 스타일·taste-skill, 서비스 워커 알림 클릭 이동이 테스트 payload에서도 동작.
    - 순서: 설계 반영(backend-api·frontend-screens·tasks) → 28차 → 구현·test·build → code-review → 커밋 → push → deploy → 운영 확인(키 없이 401) → 보고. 실기기 수신 확인은 메인 세션·사용자.
    - 진행: `anyang-backend-api`·`anyang-backend-tasks`·`anyang-frontend-screens`·`anyang-frontend-tasks`를 승인된 설계에서 뺐다(28차 전 단계).
    - 설계 반영(2026-10-04): backend [[anyang-backend-api]] 8-1절·[[anyang-backend-tasks]] 19(제한은 스키마 변경 없이 기존 `auth_attempts` 사용 — 운영 DB에 check 제약 없음 확인, 구독 0이면 슬롯 안 씀, payload에 선택 필드 `url` 추가·공지 payload 불변), frontend [[anyang-frontend-screens]] 알림·서비스워커 절·[[anyang-frontend-tasks]] T1~T3, database [[anyang-database-schema]] auth_attempts 값 한 줄 + 57 절 낡은 표기 정리. 겸해서 backend-api 61·1859행 낡은 문구 정정.
    - (a) **사용자 확인 필요 — 에이전트 제안값(`(미확정)`, 제안대로 구현)**: backend ① payload 필드명 `url`과 서비스워커 경로 검증 ② 제한 저장 값 `attempt_type='test_notify'`·`identifier_type='user'`·`sha256(user_id)` ③ 429 코드 `TOO_MANY_ATTEMPTS` 재사용 ④ 200이면서 성공 0 응답 처리 ⑤ 발송 루프 공용 함수 분리 ⑥ 같은 사용자 동시 요청 2회 허용(락 없음; 화면은 진행 중 버튼 비활성으로 막음). frontend ⑦ 버튼은 알림이 켜져 있을 때만 표시(꺼져 있으면 결과가 항상 "구독 없음"이라 숨김) ⑧ 소제목 "알림 확인"·보조 "지금 알림이 오는지 확인해 보세요." ⑨ 안내 글: 성공 "n대에 테스트 알림을 보냈어요." / 구독 없음 "알림을 받는 기기가 없어요. 알림을 껐다가 다시 켜 주세요." / 429 "잠시 후 다시 시도해 주세요." ⑩ 일부 실패 "n대에 보냈어요. m대는 보내지 못했어요." ⑪ 새 안내 "알림을 보내지 못했어요. 잠시 후 다시 시도해 주세요."(200 `{0,m}`·401·5xx·네트워크 오류 등) ⑫ 200 `{0,0}`은 "구독 없음"과 같은 안내 ⑬ 서비스워커가 `/\`로 시작하는 `url`도 거부.
    - **구현(2026-10-04)**: backend `80258c3`(`web/lib/push-send.ts` `sendToUserDevices` 분리, `web/app/api/notify-settings/test/route.ts`, `auth-attempts.ts` `claimTestNotifySlot`, notify 라우트가 공용 함수 사용), frontend `eb08b31`(sw.js `url` 처리, `describeTestResult`, 알림 설정 화면 버튼; 스킬 `design-taste-frontend` 호출 — 제품 UI는 범위 밖이라 청안 설계 우선), database `edcdb4d`(schema status active, auth_attempts 값 반영). code-review 치명·주요 0, 경미 2 → frontend `57c84a1`(sw.js url에 제어 문자 있으면 거부 — `/\t/evil.com` 차단, `role="status"` 상시 렌더) → 재검수 0건. npm test 418·build 통과. 화면 실행·실기기 수신은 미확인.
      - 경미(문서, 설계 잠금): [[anyang-backend-api]] 8-1절 1431행 "운영 DB 실제 제약은 읽지 않았다"는 database 확인(check 없음, pkey만)과 어긋남 — 다음 설계 수정 때. 참고: 전부 실패(`{0,m}`)여도 1분 슬롯은 소비됨(설계대로).
    - **push·배포(2026-10-04)**: 기록 커밋 `30a22f7`, push `4950b33..30a22f7`. `vercel deploy --prod` 1회 성공(`dpl_B9V9L6N1xWfUVhMtzCJN7aeUstsB`, 별칭 `web-beta-smoky-16.vercel.app`). 로그인 없이 `/login` 200, `POST /api/notify-settings/test` 401, `POST /api/jobs/notify` 키 없이 401, `/sw.js` 200·새 `url` 검사 코드 포함, 배포 직후 error 로그 없음. 실기기 수신·클릭 이동 확인은 메인 세션·사용자(화면: `https://web-beta-smoky-16.vercel.app/settings/notifications`, 알림이 켜져 있어야 버튼이 보임).
    - **실기기 수신 확인(2026-10-04, user, 메인 세션 전달 — "알람이 잘 왔어, 확인 완료")**: 테스트 알림이 실기기에 도착. 운영에서 웹 푸시 실제 전달이 처음 확인됐다(VAPID·구독·서비스워커 경로 동작). 58(a) 제안값 13건은 사용자 결정 전이라 열린 항목 그대로.
59. **설계(2026-10-04, 새 요청 — 직군 매칭 반영, user "직군도 매칭에 반영해줘")**: 테스트 계정 직군을 `it`로 두었는데 알림 매칭은 `user_preferences`(대화 추출 관심사)만 써서 직군이 반영되지 않는다. 예전 "프로필 미사용"(27·33 취소)을 바꾸는 사용자 결정 — [[anyang-service-scope]] "직군 매칭 반영" 행, [[anyang-ai-models-data-transfer]] 보충(고정 직군 문장 임베딩은 사용자 데이터 전송이 아님, 확정은 59 승인). 전면 뒤집기가 아니라 superseded 처리는 하지 않았다.
    - 메인 세션 제안 방향(사용자에게 설명함, 설계에서 대안 비교 후 권장안 확정): 직군 코드 8종마다 고정 설명 문장 → Gemini 1회 임베딩·저장(테이블/상수/시드 마이그레이션 중 선택); 알림 매칭에서 직군 벡터 ↔ 공지 청크 유사도, 관심사 벡터와 결합 방식 비교((a) OR (b) 가중 평균 (c) 기타), 직군 쪽 임계값 별도 여부; 실측(운영 공지 462건과 직군 문장별 유사도 분포, 테스트 계정 `it` 문장의 최근 14일 공지 유사도, 임베딩 비용·호출 수); 관심사 없이 직군만 있는 사용자도 대상, 직군 미설정은 현행; "나에게 맞는 공지" 추천 정렬 반영 여부는 별도 사용자 결정(권장안 포함); 기존 안전장치(enabled_at 이후, 14일, 1회 발송) 유지; 코드 8종은 database-schema; 테스트는 57-D 6 승인 `enabled_at` 1행 당기기와 연계.
    - 진행: `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 승인된 설계에서 뺐다(30차 전 단계). 설계 database → backend → (영향 있으면) frontend draft. 코드·운영 변경·배포 없음.
    - 2026-10-04 중간에 backend 호출 1회가 사용량 한도로 끊겼다(산출물 없음). 메인 세션 지시로 재개해 다시 호출했다.
    - **실측(운영 읽기 전용, database·backend)**: profiles 4명(직군 it 1·manufacturing 1·other 1·null 1), 직군 있고 선호 없는 사용자 1, 직군·선호 모두 2, 알림 켠 사용자 1. 임베딩은 전부 `gemini-embedding-001` 768차원, taskType 미지정, 저장 벡터 비정규화(cosine `<=>`라 무관). 직군 문장 임베딩은 v1·v2 각 8회(약 0.4~0.6초/회, 토큰 정보 없음).
      - v1(긴 문장 "청년을 위한 … 지원 사업 공지"): 공지별 유사도 중앙 0.64~0.66으로 좁음, 상위 5개에 '청년토랑'·'청년도전'이 7종 공통 — 공통 어구가 지배, 변별력 약함. 0.70에서 최근 14일 3건 모두 0건.
      - v2(직군 고유 어휘만, 예 "IT 소프트웨어 개발자 프로그래밍 코딩 데이터 AI"): 공통 지배는 사라짐(0종), 상위 5개 적합 6개 중 5개(경계, it는 엄격히 보면 2건), 그러나 유사도가 전체적으로 약 0.1 낮아져 0.70·0.65에서 전 직군 0건, 0.60에서 직군별 1~19건. 새 공통 지배 공지 1건("공연예술기획 AI활용 아카데미", 5개 직군 상위). OR 신규 후보(두 계정, 0.60) 5건 중 직군에 맞는 것 2~3건(40~60%). 최근 14일 3건은 0.60에서도 culture_arts 1건뿐. construction_agriculture는 코퍼스에 맞는 공지가 거의 없음.
    - **설계 draft 완료**: [[anyang-database-schema]] "직군 문장 벡터 저장·알림 쿼리" 절(새 테이블 `occupation_embeddings` 0022 권장, RLS, 시드 스크립트 7회, 실측 v1·v2 소절), [[anyang-backend-api]] 새 7-2절(대안 비교 (a) 임베딩 OR·(b) 가중 평균·(c) 키워드 태깅·(d) 공지별 Jev/LLM 분류, 판단 기준 4개, 매칭 규칙, 사용자 결정 목록), [[anyang-backend-tasks]] 20(20-0 v2 재실측 게이트). frontend 영향 없음(API·payload 불변).
    - **사용자 결정 필요 (59-D)**:
      - ① 방법: backend 권장은 (a) 임베딩 OR(v2 문장)이었으나 v2 실측에서 판단 기준 ①~③은 경계 충족, ④(신규 후보 중 직군 적합 절반 이상)는 경계(40~60%)이고 쓸 수 있는 임계값은 0.60뿐이며 최근 공지에는 거의 안 걸린다. pm 의견: 지금 데이터로는 (a)의 효과가 작다 — (a)를 0.60으로 시험 도입할지, (c) 결정적 키워드 태깅(외부 AI 없음, 정밀도 높고 재현율 낮음, `notices` 컬럼·수집 경로·백필 변경)으로 갈지, 둘을 함께 쓸지 사용자 판단.
      - ② v2 문장 8개(저장 7행, `other` 행 없음) ③ 직군 임계값(후보 0.60, 선호 0.70 유지) ④ 직군만 있는 사용자 포함 ⑤ 합산 상한 20건 ⑥ "나에게 맞는 공지" 추천 반영(권장: 이번엔 안 함) ⑦ 문장 원본은 코드 상수·테이블 `sentence`는 기록용 ⑧ 운영 작업 승인(0022 적용, 시드 7행 쓰기, 코드 배포).
      - 테스트: 57-D 6의 `enabled_at` 1행 당기기와 연계. 직군 있고 선호 없는 계정으로 확인, 0건이면 "쿼리·라우트까지만" 보고.
    - **Jev 도입 제안(후속 후보, 권장안 아님)** — 아래 `## Jev 도입 제안` 절.
    - **사용자 결정·승인(2026-10-04, user, 메인 세션 AskUserQuestion 직접 응답)**: ① (a) 임베딩 OR 시험 도입(v2 문장) ② v2 문장 8개 확정(저장 7행, `other` 행 없음) ③ 직군 임계값 0.60, 관심사 0.70 유지 ④ 직군만 있는 사용자도 알림 대상 ⑤ 결합 후보 상한 20건 ⑥ "나에게 맞는 공지" 추천에는 반영 안 함(알림만) ⑦ 문장 원본은 코드 상수, 테이블 `sentence`는 기록용 ⑧ 운영 작업 승인: 0022 적용, 시드 7행, 코드 배포. 진행: (미확정) 정리 → 30차 → 구현(0022, 시드는 Gemini로 문장 7개 임베딩 후 MCP로 입력, 알림 OR 결합) → test·build → code-review → 커밋 → push → deploy → 운영 확인. 테스트는 대상 공지 수를 먼저 세고 0건이면 운영 데이터를 건드리지 않음.
    - (p) **결정(2026-10-04, user)**: 에이전트가 `SUPABASE_ACCESS_TOKEN`(개인 접근 토큰)으로 Supabase 관리 API를 직접 호출하는 것을 **금지**한다. DB 접근은 Supabase MCP 도구로만 한다. 메인 세션 확인: database가 환경변수 `$SUPABASE_ACCESS_TOKEN`으로 `/v1/projects`와 `/database/query/read-only`를 호출했다(쓰기 흔적 없음). 큰 벡터 리터럴 같은 측정은 SQL 안에서 계산(서브쿼리·저장된 벡터)하는 방식으로 대체. 규칙 반영 위치: `.claude/rules/dev-common.md` Operating Rules와 `.claude/agents/database.md` — 둘 다 pm의 Write·Edit 범위(인수인계·프로젝트 문서·index/log·glossary) 밖이라 pm은 고치지 않고 메인 세션에 반영을 요청한다. 그때까지 pm 작업 지시서에 금지를 명시한다.
      - **규칙 반영 완료(2026-10-04)**: 메인 세션이 `.claude/rules/dev-common.md` Operating Rules 13번(Supabase DB는 MCP로만, 개인 접근 토큰으로 관리 API 직접 호출 금지)과 `.claude/agents/database.md` 워크플로우 5번(뒤 번호 7·8로 조정)을 추가, `python scripts/test_rules.py` 통과(7 groups). 커밋 `34927ec`(git-manager, push 안 함). 이후 작업 지시서에 금지 문구를 따로 적지 않는다.
    - **구현(2026-10-04)**: database `7e3559b`(0022 `occupation_embeddings` 작성·운영 적용 — MCP apply_migration + schema_migrations, RLS, 0019 점검 0행), backend `cc15976`(`web/lib/occupation-sentences.ts` v2 문장 7개, notify OR 결합 — 관심사 0.70·직군 0.60 각자 거른 뒤 합집합·같은 공지는 높은 유사도 하나·상한 20, 직군 null/other/테이블 비었거나 없음(42P01)이면 현행, `web/scripts/seed-occupation-embeddings.ts`는 `DATABASE_URL` 필요한 upsert라 운영 미사용; test 425·build 통과). 시드: database가 MCP `execute_sql`로 7행 upsert(관리 API 미사용), 7행·768차원·모델·문장 상수 일치 확인. code-review: 코드 치명·주요 0, 문서 정정(주요 2·경미) → 30차 재기록 위 참고.
      - **대상 공지 수(읽기 전용, SQL 안 계산)**: 테스트 계정(it) — `enabled_at` 조건 없이 직군 0·관심사 2·합 2, 조건 있으면 0(활성화 이후 수집 공지 없음). manufacturing 계정 — 직군 0(14일 풀 최대 0.576 < 0.60), `enabled_at` null이라 알림 대상 아님. it 14일 풀 최대 0.563. **직군 쪽 대상이 0건이라 지시대로 운영 데이터(`enabled_at` 당기기)는 건드리지 않음.** 시드 롤백은 `delete from occupation_embeddings`.
      - **push·배포(2026-10-04)**: 기록 커밋 `1161a4f`, push `63efbb8..1161a4f`. `vercel deploy --prod` 1회 성공(`dpl_92XCK1WMd4jLVkvUsN8cEYbp6DFJ`, 16:02 KST, 별칭 `web-beta-smoky-16.vercel.app`). `/login` 200, notify 키 없이 401, 배포 후 error 로그 없음, 16:05 첫 cron 실행 notify 라우트 오류 없음(info). 관리 API 미사용.
      - 남은 것: 직군 매칭 실제 발송은 직군 0.60 이상인 새 공지가 수집되고 알림 켠 사용자에게 매칭될 때 확인된다(현재 대상 0). 규칙 반영(59(p))은 메인 세션.
    - (p) 원래 기록: database가 v2 실측 때 벡터 리터럴(약 58KB)이 커서 MCP 대신 "Supabase 관리 API의 읽기 전용 쿼리 엔드포인트"로 SQL을 실행했다고 보고. 어떤 자격 증명으로 호출했는지 보고에 없다 — 기존 키 사용 범위 원칙과 맞는지 다음 database 호출 때 확인(값은 묻지 않고 종류·보관 위치만).
60. **새 요청(2026-10-04, user — 채팅 뒤로가기 시 대화·인용 공지 유지, frontend만, DB·서버 변경 없음)**: 채팅 답변 아래 인용 카드 5건 중 하나를 눌러 `/notices/[id]`로 갔다가 뒤로가면 대화와 인용 카드가 사라진다. 사용자는 1→5번 순차 열람을 기대한다. 원인(메인 세션): `web/app/(tabs)/chat/chat-client.tsx:33` messages가 컴포넌트 state뿐이고, 새 대화에 conversation_id가 생겨도 URL이 `/chat` 그대로라 재마운트 시 빈 상태(`page.tsx`는 `?conversation_id`가 있을 때만 과거 대화를 연다). 인용(citations)은 SSE event로만 오고 DB에 저장되지 않는다.
    - 사용자 결정(범위 1·2번만): ① 같은 탭 임시 보관 — messages(인용 포함)와 스크롤 위치를 sessionStorage에 conversation_id 키로 보관, 뒤로가기·같은 탭 새로고침 때 서버 재조회 없이 즉시 복원·스크롤 복원, sessionStorage 접근은 try/catch, 실패하면 ② 경로, localStorage 금지(탭 종료 시 삭제) ② URL 동기화 — conversation_id가 생기면 `router.replace`로 `/chat?conversation_id=…`(히스토리 추가 없음), sessionStorage 없어도 서버에서 대화 본문 복원(인용 카드는 없음, 수용). 스트리밍 중 이동 후 복귀 시 마지막 답변 처리 방식을 정해 문서에 적는다. 공지 상세 뒤로 버튼과 브라우저 뒤로가기가 같은 결과. 새 대화 시작 등 기존 흐름과 충돌 없음, 다른 사용자·대화 보관분 섞임 방지(로그아웃 시 정리 포함). 에이전트가 새로 정한 세부값은 `(미확정)`으로 두고 제안대로 구현.
    - 진행: `anyang-frontend-screens`·`anyang-frontend-tasks`를 승인된 설계에서 뺐다(31차 전 단계). frontend 설계 → 31차 → 구현 → test·build → code-review → 커밋 → push → deploy → 운영 확인.
    - **설계 draft(2026-10-04, frontend)**: [[anyang-frontend-screens]] 3-1절·테스트 방법(단위 ①~⑧, 수동 가~자)·확인 항목 8, [[anyang-frontend-tasks]] S1(순수 함수)·S2(`chat-client.tsx`·`page.tsx`)·S3(로그아웃·탈퇴 정리). backend 영향 없음(기존 `GET /api/conversations/:id/messages`와 43-b 부분 답변 저장만 사용). 공지 상세 뒤로 버튼은 이미 히스토리 있으면 `router.back()`·없으면 `/notices`라 변경 없이 브라우저 뒤로가기와 같은 결과가 된다.
    - (a) **사용자 결정 필요 — 결정 문구와 다른 제안**: URL 동기화 수단. 결정은 `router.replace`인데 frontend 확인 결과 위험이 두 가지다. ① 지금 `chat-client.tsx`는 `initialConversationId`가 바뀌면 서버 대화를 다시 불러와 스트리밍 중인 messages를 덮어쓴다(설계는 `loadedIdRef`로 막음) ② Next.js 16.3.6에서 페이지 세그먼트 캐시 키에 검색 파라미터가 들어가, 스트리밍 중 `router.replace`가 재마운트·스트림 중단을 일으키는지 확정하지 못했다(실행 미확인). 제안: 응답 헤더로 conversation_id를 받는 즉시 `window.history.replaceState`(Next.js 문서상 라우터와 연동, 서버 요청·재렌더 없음, 히스토리 추가 없음 — 결정의 목적과 같음). 대안: 스트림 완료 후 `router.replace`(첫 대화에서 답변 도중 이동하면 URL에 id가 없어 서버 복원 불가). 구현 중 제안 안이 안 되면 설계 변경으로 보고.
    - 에이전트 제안값(`(미확정)`, 제안대로 구현 예정): 키 `anyang:chat:v1:{userId}:{conversationId}`, 보관 JSON 필드·모양 검사, 크기 상한(content 합 200,000자, 같은 탭 대화 10개, 용량 오류 시 1회 재시도), 저장 지연 500ms·즉시 저장 시점, 스트리밍 중 이동 후 복귀는 서버 1회 조회해 병합하고 답이 없으면 "답변이 중간에 멈췄을 수 있어요…" 한 줄, 스크롤 `atBottom` 8px, 복원 전 빈 대화 안내 숨김, 로그아웃 정리 3곳(`profile-section.tsx`·`suspended-actions.tsx`·탈퇴 성공 후 `account-client.tsx`; 세션 만료로 밀려나는 경우는 정리 안 함), 새 대화 시 이전 보관분은 지우지 않음.
    - **(a) 결정(2026-10-04, user, 메인 세션 전달)**: URL 동기화는 conversation_id를 받는 즉시 `window.history.replaceState`. 앞의 "router.replace"는 메인 세션이 적은 수단이었고 사용자 결정의 본뜻은 "주소에 대화 번호를 붙여 복원 가능하게"다(메인 세션이 체감 차이 — 답변 끊김 없음, 답변 도중 이동해도 복원 — 를 설명, 사용자 동의). 에이전트 제안값 전부 제안대로 확정(상한 200,000자·대화 10개, 저장 지연 500ms, 스트리밍 중 이동 시 서버 1회 조회 병합·안내 한 줄, 하단 판정 8px, 세션 만료 시 미정리, 새 대화 시 이전 보관분 유지).
    - **구현(2026-10-04)**: frontend `31618df`(S1 `web/app/_lib/chat-snapshot.ts`·테스트, S2 `chat-client.tsx`·`page.tsx` — userId 전달, 보관분→서버 복원, `x-conversation-id` 수신 즉시 `replaceState`, `loadedIdRef`, S3 로그아웃·탈퇴 3곳 정리; design-taste-frontend는 새 UI가 없어 범위 밖). code-review 1차: 치명 0·주요 3·경미 7 → 재위임 1회 `36344a7`(스크롤 복원 순서 — 오류 문서 [[anyang-chat-snapshot-scroll-restore-order]], 뒤로가기 시 prop null이면 `location.search` 대체, 사용자 메시지 즉시 저장, 인용 병합 꼬리 기준) → 재검수 경미 3 → 재위임 2회 `beb8a52`(스트림 종료 즉시 저장, id 전환 시 `pendingScroll` 초기화, 이전 조회 AbortController 취소) → 재검수 치명·주요 0. npm test 436·build 통과. 화면 실행 확인은 못 함(브라우저 도구·로그인 없음).
    - (b) **사용자 결정 필요 — 설계 변경(code-review)**:
      - ① (주요) "답변이 중간에 멈췄을 수 있어요" 문구가 거짓이 될 수 있다: 설계 3-1절 6번은 복원 직후 보관분을 `streaming: false`로 다시 쓰는데, 서버 메시지가 보관분보다 적어 안내를 띄운 경우 사용자가 안내대로 새로고침하면 `streaming: false` 보관분이 읽혀 서버 조회 없이 같은 부분 답변만 나온다(서버에 나중에 저장된 답은 계속 안 보임). 제안: 안내를 띄운 경우(interrupted)는 `streaming: true`를 유지해 다음 복원 때 서버를 다시 조회. pm 권장: 제안대로.
      - ② 서버 조회 실패 시 보관분 표시: frontend가 설계(5번 ③ "실패하면 빈 화면 유지") 밖으로 응답 실패(`!res.ok`) 때 보관분을 보여 주게 했다. 빈 화면보다 낫지만 삭제된 대화의 보관분이 404에도 보일 수 있고, 네트워크 예외 때는 보관분을 안 보여 처리가 다르다. 선택: (가) 채택하고 두 경우를 같게 맞추되 404는 보관분 삭제·빈 화면 (나) 설계대로 빈 화면으로 되돌림. pm 권장 (가).
      - ③ 문서 정리: 3-1절 제목·tasks 제목의 "설계 draft", 62·908행 "3-1절 값은 (미확정)", 마커 삭제로 깨진 괄호, 그리고 frontend가 잠금 범위 밖으로 고친 3-1절 문장 2곳(내용은 31차 승인과 일치)의 사후 인정.
      - 그래서 `anyang-frontend-screens`·`anyang-frontend-tasks`를 승인된 설계에서 뺐다(31차 이후). 결정 뒤 frontend 설계 반영 → 32차 → 구현 → 검수 → 커밋 → push → deploy. **push·배포는 이 결정 뒤로 멈춤**(로컬에 `31618df`·`36344a7`·`beb8a52` 미배포).
    - (c) 경미(검수 기록): 브라우저 뒤로가기로 `/chat`(prop null)에 도착하는 경로에서 진행 중이던 이전 조회를 취소하지 않아, 늦게 끝나면 messages를 덮어쓸 수 있다(기존 동작, 드묾). (b) 반영 때 함께 고칠지 결정.

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

2026-10-04(18차): `anyang-backend-api`를 뺀다 — 사유: 확인 항목 55(s) code-review "설계 변경 필요"(image_count에서 `div.p-photo` img 제외 규칙이 설계에 없음). 사용자 확인 후 재기록한다. 같은 날 18차로 `anyang-frontend-screens`·`anyang-frontend-tasks`·`anyang-cheongan-design-adoption`도 뺀다 — 사유: 55(r) 배지 문구 "본문 이미지" → "이미지"(user 결정). 반영 후 19차로 재기록한다.

2026-10-04(19차): 55(s)·(r) 사용자 결정(메인 세션 전달)을 backend(5-1절 p-photo·smiley 제외 규칙, 실측 셀렉터)와 frontend(칩 문구 "이미지", `0c66ed0`)가 반영한 뒤 4종을 다시 기록한다. 55-b(고정 공지 실측)·55-i(첨부 직접 링크)는 미확인 그대로다.

- [[anyang-cheongan-design-adoption]] — 승인일 2026-10-04, 승인자 user

2026-10-04(19차 이어서): `anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 55 백필 방식 변경(서버 분할 실행, `BACKFILL_SECRET`, user 결정). backend 설계 반영 후 20차로 재기록한다.

2026-10-04(20차): 백필 방식 변경(user, 메인 세션 전달 — "사용자가 승인한 설계 값, 별도 재승인 불필요")을 backend가 반영한 뒤 2종을 다시 기록한다. 승인 범위는 전달된 값 1~4와 그로부터 직접 따라 나온 값이다. 55(w) 제안값 3건(250초, `remaining_unembedded`, `INVALID_RANGE`)은 `(미확정)` 그대로 승인 범위 밖이다.

2026-10-04(20차 이어서): `anyang-backend-api`를 뺀다 — 사유: 확인 항목 55(x) code-review "설계 변경 필요"(백필 임베딩 시간 예산 250초가 maxDuration 300 안에서 안전하지 않음). 사용자 결정 후 재기록한다. 같은 사유로 `anyang-backend-tasks`도 뺀다(5-3에 250초가 적혀 있음).

2026-10-04(21차): 55(x)·(w)·(y) 사용자 결정(메인 세션 전달 — 200초, `remaining_unembedded`·`INVALID_RANGE` 확정, null 보강)을 backend가 반영한 뒤 2종을 다시 기록한다.

2026-10-04(22차): `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 56(안양시 클라우드 IP 차단, UNO Q 보드 수집기·Vercel 받기 API, 새 요청). 재승인 뒤 다시 기록한다. 같은 사유로 `anyang-frontend-screens`·`anyang-frontend-tasks`도 뺀다(관리자 "수동 수집" 버튼이 직접 수집 스위치로 410을 받음 — backend 보고). 남은 승인된 설계는 `anyang-cheongan-design-adoption`(19차)이다.

2026-10-04(23차): 확인 항목 56 사용자 결정·승인(메인 세션 전달 — B안, 스위치, 제안값 전부 확정, "제안대로 승인"). database가 B안을 본문 기준으로 정리(별도 클러스터 `17 collector`, 포트 5433, `pg_createcluster`, 소켓 전용·peer, USB 가드 드롭인)한 뒤 7종을 기록한다. 포트 5433·클러스터 구성 세부는 B안 승인에서 직접 따라 나온 값으로 본다. 나머지 문서의 `(미확정)` 표시는 구현 단계에서 각 소유자가 지운다.


2026-10-04(23차 이어서): `anyang-board-collector`·`anyang-board-collector-db`를 뺀다 — 사유: 확인 항목 56(j) code-review "설계 변경 필요"(full 성공 보고 충돌, 표에 없는 코드 값, 응답표 문구, PGPORT, 90일 삭제). 사용자 결정 후 24차로 재기록한다.

2026-10-04(24차): 56(j) 사용자 결정(메인 세션 전달 — (나) full 일일 보고, 코드 값 5종·응답표·PGPORT 문서 정합, collector_runs 90일 삭제)을 database·backend가 반영한 뒤 2종을 다시 기록한다. success 보고 행은 `error_summary=null`(frontend 변경 불필요)로 정한 것은 (나)에서 직접 따라 나온 값으로 본다.

- [[anyang-board-collector]] — 승인일 2026-10-04, 승인자 user

2026-10-04(24차 이어서): `anyang-board-collector-db`를 뺀다 — 사유: 확인 항목 56(l) database "설계 변경 필요"(보드 소켓 폴더에 `arduino` 쓰기 권한 없음, 클러스터 실행 사용자 변경 필요). 사용자 결정 후 25차로 재기록한다.

2026-10-04(25차): 56(l) (c)안(user, 메인 세션 전달)을 database가 반영(B-1·B-4, 같은 값이 적힌 F-1·F-2·인프라 문장·확인 항목 2를 함께 정합, 164행 낡은 문장 정정)한 뒤 다시 기록한다.

- [[anyang-board-collector-db]] — 승인일 2026-10-04, 승인자 user

2026-10-04(26차): `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 57(알림 잡 활성화·과거 공지 일괄 발송 방지, 새 요청). 재승인 뒤 다시 기록한다. 남은 승인된 설계: `anyang-cheongan-design-adoption`, `anyang-frontend-screens`, `anyang-frontend-tasks`, `anyang-board-collector`, `anyang-board-collector-db`.

2026-10-04(27차): 확인 항목 57-D 사용자 결정·승인(메인 세션 전달 — 8건 전부, 제안값이 문서에 적힌 그대로 확정)으로 3종을 다시 기록한다. 각 소유자가 구현 단계에서 `(미확정)` 표시를 지운다.

2026-10-04(27차 이어서): `anyang-backend-api`·`anyang-backend-tasks`·`anyang-frontend-screens`·`anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 58(테스트 알림 버튼, 새 요청). 설계 반영 후 28차로 재기록한다. 같은 사유로 `anyang-database-schema`도 뺀다(`auth_attempts` 값 셋에 `test_notify`·`user` 한 줄 추가).

2026-10-04(28차): 확인 항목 58 — 사용자가 메인 세션을 통해 승인한 값(경로·인증·본인 구독·제목·클릭 이동·410/404 삭제·notify_logs 미기록·1분 1회 429·응답·409 `NO_SUBSCRIPTION`·정지 규칙·버튼·안내 3종·서비스워커 이동, "재승인 없음")을 backend·frontend·database가 반영한 뒤 4종을 다시 기록한다. 승인 범위는 그 값들이다. 에이전트가 새로 정한 값은 `(미확정)` 그대로 승인 범위 밖이며, 확인 항목 58 (a)에 모아 사용자 확인을 받는다(20차와 같은 처리 — 제안값대로 구현한다).


2026-10-04(28차 이어서): `anyang-database-schema`·`anyang-backend-api`를 뺀다 — 사유: 확인 항목 57(n) 알림 임계값 0.75 → 0.70(user 결정). 값 반영 후 29차로 재기록한다.

2026-10-04(29차): 57(n) 사용자 결정(0.70)을 database(2곳)·backend(4곳, 겸해서 8-1절 제약 확인 사실 정정)가 반영한 뒤 2종을 다시 기록한다.

2026-10-04(29차 이어서): `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 59(직군 매칭 반영, 새 요청). 재승인 뒤 30차로 다시 기록한다.

2026-10-04(30차): 확인 항목 59-D 사용자 결정·승인(메인 세션 전달 — (a) 시험 도입, v2 문장 8개, 직군 0.60·관심사 0.70, 직군만 있는 사용자 포함, 상한 20, 추천 미반영, 문장 원본 코드 상수, 운영 작업 승인)으로 3종을 다시 기록한다. 각 소유자가 구현 단계에서 `(미확정)` 표시를 지운다. 결정과 다른 서술(예: 설계 문서의 "v2 실측 후 확정" 게이트 20-0)은 결정으로 충족된 것으로 본다.

2026-10-04(30차 이어서): 3종을 뺀다 — 사유: 확인 항목 59 code-review 문서 정정(확정값 0.60·상한 20 등이 문서에 `T_occ`·"v2 실측 뒤 정한다"·빈 괄호·"설계 draft"로 남음, database 절 제목·"마이그레이션 파일은 만들지 않았고" 사실 불일치). 값 변경 없이 30차에서 사용자가 확정한 값을 적는 정정이므로, 정정 후 같은 승인(30차)으로 다시 기록한다(10차 이어서와 같은 처리).

2026-10-04(30차 재기록): database(절 제목을 "승인·구현 완료"로, 0022 적용·시드 사실, 채택값)·backend(`T_occ` = 0.60, 빈 괄호·"설계 draft"·"v2 실측 후 확정" 정리, 앵커 링크 갱신)가 정정을 마쳤다. 값 변경 없음. backend-api 7-2절 제목의 "설계 draft"는 여러 앵커가 걸려 있어 남김(다음 설계 수정 때 앵커와 함께).

2026-10-04(30차 이어서): `anyang-frontend-screens`·`anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 60(채팅 뒤로가기 시 대화·인용 유지, 새 요청). 반영 후 31차로 재기록한다.

2026-10-04(31차): 확인 항목 60 사용자 결정·승인(①②, (a) `history.replaceState`, 에이전트 제안값 전부 확정)으로 2종을 다시 기록한다. frontend가 구현 단계에서 `(미확정)` 표시를 지운다.

2026-10-04(31차 이어서): `anyang-frontend-screens`·`anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 60(b) code-review "설계 변경 필요"(interrupted 시 보관분 streaming 플래그, 서버 실패 시 보관분 표시, 문서 정리). 결정 후 32차로 재기록한다.

- [[anyang-database-schema]] — 승인일 2026-10-04, 승인자 user
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

2026-10-04 (확인 항목 59, backend 설계 — 후속 후보, 권장안 아님): (a) 임베딩 OR가 실패하고 (c) 키워드 태깅의 재현율이 부족할 때 검토.

```text
- 위치: 공지 수집·받기 후 직군 태깅 ([[anyang-backend-api]] 7-2절 (d))
- 판단: Noul — 공지 1건이 직군 7개 각각에 해당하는가
- 속도: 현재 직군 판단 없음 → Jev 0.27초/공지 (측정, 근거: TYPESAFE_API_KEY로 공개 공지 제목 2건 × 7개 Noul 1회씩)
- 토큰: 현재 0 → 입력 483·출력 129/공지 (측정, 같은 근거) × 월 5건 안팎(추정, 근거: 최근 30일 published 5건), 백필 462회 1회성 약 125초 (추정, 근거: 0.27초 × 462)
- 주의: 일반 공지는 7개 모두 0.13~0.37로 임계값 없이는 태그가 안 붙음, 표본 2건이라 정확도 모름. 외부(미국)로 나가는 것은 공개 공지 제목뿐(사용자 데이터 없음)
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
- [[anyang-board-collector]]
- [[anyang-board-collector-db]]
- [[anyang-chat-snapshot-scroll-restore-order]]
