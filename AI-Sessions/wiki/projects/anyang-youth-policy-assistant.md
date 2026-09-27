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

### 설계 문서

재승인 대기(2026-09-28, 22·23 반영, draft): anyang-backend-api·anyang-backend-tasks·anyang-frontend-screens·anyang-frontend-tasks. anyang-database-schema는 승인 유지.

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
28. **설계 변경 필요(2026-09-28, 최종 검토 수정 중 backend 분류)**: 채팅 DeepSeek 프롬프트에 출생연도 원값이 간다. [[anyang-backend-api]] 3절 확정 원칙은 "나이대"인데 나이대 구간 정의가 설계·코드에 없다(관리자 통계의 10년 단위 예시는 "구간 폭 미확정"). 구간(예: 5년/10년) 결정 필요. 현재 원값 전송 유지.
29. **설계 변경 필요(2026-09-28, 동일)**: 비밀번호 최소 길이, 로그인·가입 시도 횟수 제한 값이 설계에 없다. 값 결정 필요. 현재 미적용.
30. **설계 확인(2026-09-28, 동일, 차단 아님)**: 한 사용자가 기기 여러 대를 등록했을 때 일부 기기만 푸시 성공하면 `notify_logs`를 success/failed 중 무엇으로 볼지 설계 7절에 없다. 현재 "모든 기기 성공해야 success" 유지(410/404 만료 구독은 삭제하고 실패로 세지 않음).
31. **문서 보완 필요(2026-09-28, 차단 아님)**: [[anyang-backend-api]]에 없는 구현 사실 2건 — Web Push payload 스키마 `{title, notice_id}`(8절, sw.js는 `/notices/[id]`로 이동), 환경변수 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`(9절 표). 승인된 설계라 잠겨 있어 26번과 함께 문서 수정 허용 여부 결정 필요.

## 승인된 설계

기준 커밋 `ef51d3c`. 문서 안의 (미확정) 제안값도 함께 확정. 확정하지 않겠다고 한 값 없음.

- [[anyang-database-schema]] — 승인일 2026-09-27, 승인자 user
- [[anyang-backend-api]] — 승인일 2026-09-28, 승인자 user
- [[anyang-backend-tasks]] — 승인일 2026-09-28, 승인자 user
- [[anyang-frontend-screens]] — 승인일 2026-09-28, 승인자 user
- [[anyang-frontend-tasks]] — 승인일 2026-09-28, 승인자 user

2026-09-28 재승인: 22·23 반영본(기준 커밋 `f525792`). 문서 안의 (미확정) 제안값도 함께 확정, 확정하지 않겠다고 한 값 없음.

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
- [[anyang-backend-api-mihwakjeong-removal-corruption]]
- [[anyang-jobs-collect-missing-maxduration]]
