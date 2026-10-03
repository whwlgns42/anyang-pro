---
type: dev-task
date: 2026-09-27
status: active
owner: backend
---

# 안양 청년정책 비서 — Backend 구현 작업 단위

## Summary

[[anyang-backend-api]] 설계 승인 후 구현할 작업을 기능 단위로 나눈 목록이다. 각 단위는
독립적으로 테스트·커밋 가능하도록 쪼갰다(dev-common 규칙 4). 순서는 의존 관계를 따른다 —
database의 마이그레이션이 먼저 적용돼야 한다.

## Context

의존: [[anyang-database-schema]]의 테이블(users/accounts/credentials/profiles/notices/
notice_chunks/conversations/messages/user_preferences/push_subscriptions/notify_settings/
consents/collect_runs/notify_logs/api_usage_logs/auth_attempts, users.suspended_at,
notices.hidden_at, notify_logs.failed_device_count)이 먼저 마이그레이션돼 있어야 아래
작업을 시작할 수 있다. 서비스 범위는
[[anyang-service-scope]](수집 대상 게시판 1개, 프로필 4항목, 알림 자유 시각+on/off, 기억·
대화 히스토리 화면, 인증 부가 테이블 미사용, 가입 시 동의, 관리자 페이지 `ADMIN_EMAILS`
기반 기능 4종)로 확정됐다.

## Details

### 작업 단위 (모두 [[anyang-backend-api]] 승인 후 착수, 값은 그 문서 기준)

1. **인증·동의** — Auth.js v5 설정(Google + Credentials provider, JWT 세션, `jwt`/`session`
   콜백에서 로그인 provider를 `token.provider`/`session`에 기록 — 12번 관리자 인가가
   의존), `/api/auth/register`(동의 항목 2개 — 수집·이용/국외 이전 — 게이트 포함, 이메일이
   `ADMIN_EMAILS`면 403 `ADMIN_EMAIL_RESERVED`로 거부 — backend 설계 1절·13-0절),
   `/api/auth/consent`(Google 로그인 동의·재동의 겸용), `POLICY_VERSION` 코드 상수,
   재동의 판정 미들웨어(1-2절 정지 확인과 같은 위치). `signIn` 콜백의 `OAuthAccountNotLinked`
   실패는 그대로 두고(자동 연결 off 유지, backend 설계 1-5절) 별도 처리 코드를 추가하지
   않는다. 비밀번호 재설정은 1차 출시 제외로 해결됨(backend 설계 1-1절) — 이 단위에
   포함하지 않는다. 테스트: 로그인/가입/동의/재동의/오류 케이스
   ([[anyang-backend-api#테스트 방법]] 1번).
1-4. **사용자 탈퇴** — `DELETE /api/account`(1-3절, consents 보관 순서). 1번 의존. 테스트:
   탈퇴 후 `consents` 보관·`user_id` null 확인.
1-5. **로그인 실패·가입 시도 제한** — `auth_attempts` 기반 판정(1-6절, 확인 항목 29):
   비밀번호 최소 8자 검증, 로그인 실패·가입 시도 IP/이메일 집계, 429 `TOO_MANY_ATTEMPTS`
   응답, `authorize()` 커스텀 에러 코드 반영. database의 `auth_attempts` 테이블·정리 잡
   ([[anyang-database-schema#auth_attempts]]) 마이그레이션 의존. 1번 의존. 테스트:
   8자 미만 가입 400, 15분/5회 초과 시 로그인·가입 차단, `auth_attempts` 기록 확인.
2. **프로필 CRUD** — `GET/PUT /api/profile`(4항목: birth_year/gender/occupation_type/
   enrollment_status). 테스트: 인증·본인 확인.
2-1. **알림 설정** — `GET/PUT /api/notify-settings`. PUT은 생성 시 `enabled_at=now()` 채움,
   `false→true` 전환 시 `enabled_at` 갱신 포함(backend 설계 2-2절). 테스트: 인증·형식 검증·
   `enabled_at` 갱신 규칙.
2-2. **기억(user_preferences)** — `GET/PUT/DELETE /api/preferences`. PUT은 동기 재임베딩
   포함(3번 의존). 테스트: 수정 시 임베딩 갱신, 실패 시 롤백.
2-3. **대화 히스토리** — `GET /api/conversations`, `GET /api/conversations/:id/messages`,
   대화 생성 시 `title` 자동 생성(첫 메시지 앞부분).
3. **Gemini 임베딩 클라이언트 + 재시도·배치** — 공통 유틸(임베딩 호출, 백오프, 배치 처리).
   이후 2-2·4·6번이 의존.
4. **임베딩 파이프라인** — `/api/jobs/embed`. 3번 의존.
5. **공지 수집기(기존 구현, 2026-10-04부터 5-1~5-4가 확장)** — `/api/jobs/collect`(대상 게시판 URL 확정됨). robots.txt 404(제한 없음)와
   게시판 HTML 구조는 2026-09-28 메인 세션이 확인했고 커밋 766ea20에서 구현·테스트됨
   (backend 설계 5절, [[2026-09-28_anyang-first-build-paused]]). 구조가 바뀌면 파서를 갱신한다.
5-1. **수집기 확장: 파서·모드·저장 규칙(신규, 확인 항목 55, 사용자 확정 반영)** —
   [[anyang-backend-api#5-1. 전체 수집·모드·겹침 방지·백필 (신규, 2026-10-04, 확인 항목 55, 사용자 확정 반영)]] 1~3번.
   **첫 단계(코드 전)**: `curl`로 목록 1페이지와 상세 3개를 받아 고정 공지 마크업(55-b)·첨부 셀렉터·본문 `<img>`
   구조(작은 이모지·아이콘 `<img>` 제외 규칙 포함)·응답 시간을 확정하고 픽스처에 반영한다. 판정 규칙을 정하지 못하면
   `isPinned`는 `false` 고정으로 두고 보고한다. `image_count`=본문 `<img>` 수 + 이미지 확장자(jpg·jpeg·png·gif·webp 등,
   대소문자 무시) 첨부 수(확정, 제외 규칙만 이 단계에서 확정). 이어서 `parseListPage`(`isPinned`)·
   `parseDetailPage`(`attachments`, `imageCount`), `runCollectJob(opts)`의 `quick`/`full`/`backfill`·`pageIndex`·
   `skipExisting`, upsert에 3개 컬럼 추가, `source_url` 기준 비교(메타데이터만 갱신/전체 갱신/삽입). 해시 충돌 건너뛰기·
   `skippedDuplicateCount`는 제거한다(글 주소 기준 462건 전부 저장). USER_AGENT는 환경변수 `COLLECTOR_CONTACT`(미설정이면
   연락처 없는 UA)로 만든다. 선행: database 0021 적용이 먼저(코드가 먼저 나가면 없는 컬럼을 쓰는 upsert가 실패,
   `notices_content_hash_key` drop이 없으면 중복 해시 삽입이 실패). 5번 의존. 테스트:
   [[anyang-backend-api#테스트 방법]] "공지 전체 수집·즉시 갱신" 중 파서, 모드 분기, 저장 규칙.
5-2. **수집 라우트·겹침 방지(신규, 확인 항목 55)** — 5-1절 4·6번. `/api/jobs/collect?mode=quick|full`(생략 시 `full`,
   잘못된 값 400 `INVALID_MODE`, 인증 먼저), 시작 시 트랜잭션 advisory lock + `running` 행 확인 + stale 정리(N 10분
   확정, 실패 처리한 행은 `STALE_RUNNING`), 겹치면 200 `skipped`(임베딩 호출 안 함), 임베딩 연쇄 유지. `/api/admin/collect-runs` POST는 `full`로
   호출하고 겹치면 409. 9번(시크릿 미들웨어)·5-1 의존. 테스트: 라우트 분기, 인증 유지, 겹침 방지, stale 정리.
   기존 `web/test/jobs-collect.test.ts`는 mode 인자·skipped 케이스를 추가해 갱신한다.
5-3. **서버 분할 백필(신규, 확인 항목 55, 2026-10-04 로컬 스크립트 방식을 대체, user 확정)** —
   [[anyang-backend-api#5-1. 전체 수집·모드·겹침 방지·백필 (신규, 2026-10-04, 확인 항목 55, 사용자 확정 반영)]] 7번.
   `/api/jobs/collect`에 `mode=backfill&from=N&to=M` 추가: 인증 `x-backfill-secret`↔`BACKFILL_SECRET`
   (`timingSafeEqual`, 비어 있으면 401, `x-scheduler-secret`로는 불허, `quick`·`full` 경로 불변), 범위 `1≤from≤to≤47`·
   `to-from+1≤5` 위반 400, `skipExisting=true` 고정, 기존 advisory lock 겹침 방지, 수집 뒤 같은 요청에서
   `runEmbedJob`을 시간 예산(200초, 확정)까지 반복, 응답 `collected_count`·`remaining_unembedded`(조회 실패 시 null, 200).
   `/api/jobs/embed`도 `x-backfill-secret` 허용(`BACKFILL_SECRET` 비면 불허). 환경변수 `BACKFILL_SECRET`(9절)은 사용자가
   Vercel에 넣고 백필이 끝나면 지운다(코드 변경 없음). `web/scripts/backfill.ts`는 쓰지 않는다 — 파일은 남기고
   "사용 안 함(DATABASE_URL 로컬 미보관)"으로만 표시한다(구현 시 파일 상단 주석 한 줄). 5-1·5-2 의존. 테스트:
   [[anyang-backend-api#테스트 방법]]의 백필 항목 — 인증 4분기(시크릿 비어 있음/틀림/맞음/scheduler 시크릿으로 backfill 시도),
   범위 검증 400, 겹침(200 `skipped`), 시간 예산 중단·대기열 소진 종료, embed 라우트 `x-backfill-secret`.
   **실제 호출은 운영 DB에 쓰므로 사용자 승인 뒤**: `from=1&to=2` 시험 → 같은 호출 재실행(중복 없음) → 1~5 … 46~47 순서로
   10회 → `count(*)`=462·`remaining_unembedded` 0·`collect_runs` 확인 → 사용자가 `BACKFILL_SECRET` 삭제 뒤 401 확인.
5-4. **조회 API 확장(신규, 확인 항목 55)** — `GET /api/notices/recommended`에 `is_pinned`·`image_count` 추가, 선호가
   없을 때의 "최근 공지" 정렬을 `is_pinned desc, published_at desc nulls last, id desc`로 변경(확정),
   추천 경로는 유사도 순서 유지·`is_pinned`는 별표 표시용(확정). `GET /api/notices/:id`에 `attachments`·`image_count` 추가. 두 API 200
   응답에 `Cache-Control: no-store`. 선행: database 0021. 테스트: 응답 필드, 정렬, 숨김 404, 헤더. 이 응답 계약이
   확정되면 frontend 설계가 의존한다([[anyang-backend-api#2-1. 추천 공지 피드·상세 (frontend 조율, 2026-09-27)]]).
5-5. **수집 잡 트리거 등록(backend 작업 아님, 확인 항목 55)** — `collect-quick`·`collect-full` pg_cron·pg_net 확장
   설치와 잡 등록, 실제 URL·`SCHEDULER_SHARED_SECRET` 입력은 database 소관 운영 작업이며 사용자 승인이 필요하다
   ([[anyang-database-schema#pg_cron / pg_net 잡 정의]]). 등록 뒤 실제 POST 1회로 배포 보호(55-e)와 pg_net 타임아웃을
   확인한다. backend는 승인 기록이 없으면 이 단위를 실행하지 않는다.
6. **채팅 + RAG** — `/api/chat`(DeepSeek 스트리밍, 검색, 기억 추출·주입). 공용 가림 함수
   (`lib/mask-pii.ts` 등 경로)를 만들어 Gemini 임베딩·DeepSeek 전송·기억 추출 결과
   문장의 Gemini 임베딩까지 세 지점 모두에서 재사용(backend 설계 3절 0번, 2차 재점검 반영 —
   기존에는 Gemini 임베딩에만 적용). **인용 공지 스트림(확인 항목 22, backend 설계
   3-2절)** — RAG 검색 결과(notice_id 중복 제거)를 `event: citations` SSE 이벤트로 DeepSeek
   청크 전에 먼저 전송, 빈 목록도 `data: []`로 전송. **나이대 구간 계산(확인 항목 28,
   backend 설계 3절)** — `birth_year`를 청년정책 구간 문자열로 변환해 프롬프트에 넣고
   원값은 전송하지 않는다(null이면 조건 생략). **기억 주입(신규, 확인 항목 43, backend 설계
   3-3절, 핵심)** — `user_preferences` 최근 N개·유사 K개(합계 최대 10)를 조회해 시스템
   프롬프트의 `기억하는 사용자 정보:` 절로 넣는다. 유사 기억 조회는 3절 2-a에서 계산한
   원본 메시지 임베딩을 재사용(추가 임베딩 호출 없음). 기억 0건이면 절 생략, 조회 쿼리
   실패 시 폴백(3-3절). **기억 추출 매 답변화(확인 항목 43, backend 설계 3절 5번·3-3-1절)**
   — `PREFERENCE_EXTRACTION_EVERY_N_MESSAGES`(6의 배수 게이트) 제거,
   `maybeExtractPreference`를 `consumeAndStore`의 답변 저장 직후 매번 호출하도록 변경.
   `summarizePreference`를 새 프롬프트·JSON 배열 출력(`extractPreferences` 제안 이름)으로
   교체, 파싱 실패는 빈 배열로 처리. 저장은
   [[anyang-database-schema#user_preferences — 대화에서 추출한 선호, 벡터. "AI가 기억하는
   내 정보" 화면의 데이터]]의 중복 방지·갱신 쿼리(UPDATE 실패 시 INSERT)를 따른다. **부분
   답변 저장(확인 항목 43-b, backend 설계 3-3-2절)** — 스트림 읽기 중 예외·중단이 나도
   그때까지 모은 `assistantText`가 비어 있지 않으면 `messages`에 저장한다(빈 문자열이면
   저장하지 않음, 기존 `if (assistantText)` 조건 유지). 잘린 답변 표시는 두지 않는다. 3번
   의존. 테스트: 3-3절·3-3-1절·3-3-2절·3절 5번의 테스트 방법([[anyang-backend-api#테스트
   방법]]) 참고.
6-1. **Jev 게이트(신규, 확인 항목 46, backend 설계 3-3-3절, 보류 — 추후 운영 서비스 Jev 적용 시 재개(2026-10-03, user))** —
   상태: 보류. 이 항목의 값은 재개 때 다시 검토하며 이번 재승인·구현 대상이 아니다.
   `extractAndStorePreference`의 `extractPreferences` 호출 직전에 Jev Noul 판정 1회를
   둔다. 확률 < 임계값(0.2, 미확정)이면 추출·저장을 건너뛴다. Jev 오류·타임아웃(2초,
   미확정)·`TYPESAFE_API_KEY` 없음이면 기존대로 추출(fail-open). 전송은 `maskPii` 적용한
   사용자 메시지만. 판정 함수는 `web/lib/`에 작게 분리해 목으로 바꿀 수 있게 한다. 키는
   서버 환경변수만(9절 환경변수 목록 갱신). 6번 의존. 확정 전 선행 조건: 확인 항목
   46-a(전송 결정 문서·처리방침 갱신 여부)가 해결돼야 착수한다. 테스트: 통과/차단/
   fail-open/전송 범위 단위 테스트([[anyang-backend-api#테스트 방법]] "Jev 게이트").
6-2. **모순 선호 즉시 정정 — 직전 문장 보관(신규, 확인 항목 48·48(f), backend 설계 3-3-4절, 최종 결정 반영, 재승인 대기)** —
   6-1(Jev 게이트, 보류)에 **의존하지 않는다**. 6-2만 단독으로 구현한다. 사용자 최종 결정(2026-10-03): 안 2a — 같은 행
   UPDATE, 직전 문장 1단계만 `previous_fact`에 보관, 기억 id 불변. 활성 조건(`superseded_at`)·새 행 INSERT 방식은
   채택하지 않았다.
   - 선행 조건(순서 고정): ① **database 구현: 마이그레이션 0020 적용**
     ([[anyang-database-schema#마이그레이션 계획 (0020, 확인 항목 48(f))]], `previous_fact text` 컬럼 추가) →
     ② backend 구현. 0020이 먼저 적용돼야 한다 — 코드가 먼저 나가면 없는 컬럼을 참조하는 대체 쿼리가 오류가 난다.
     0020만 먼저 적용돼도 현재 코드는 정상 동작한다(database 문서). ③ 6번(채팅·기억 주입) 완료.
   - 작업 1(추출·저장): `fetchMemories`가 `{id, preference_text}[]`를 돌려주도록 바꾸고(시스템 프롬프트 기억
     절은 문장만 사용, 쿼리 변경 없음), 같은 목록(최근 5 + 유사 5, 최대 10)을 추출 호출에 순번(1..N)으로 실어
     `extractPreferences`가 `{fact, replaces}[]`를 돌려주게 한다(설계 3-3-4절 확정: 잘못된 `replaces`는 `null` 처리·문장
     유지, 같은 순번 중복은 첫 원소만 유지, 옛 형식 문자열 원소는 `replaces: null`). `extractAndStorePreference`는
     문장마다 `replaces`가 있으면 순번→id로 바꿔 database의 대체 쿼리(같은 행 UPDATE, 바뀌기 전 문장을
     `previous_fact`로, `where id and user_id`, `user_id`는 세션 값)를 먼저 실행하고 1행이면 끝, 0행이면 기존 유사
     갱신 → INSERT로 간다. 반환 `id`는 요청한 id와 같다.
   - 작업 2(건드리지 않는 것): 유사 갱신(2경로)·`PUT /api/preferences/:id`는 `previous_fact`를 SET 목록에 넣지 않는다.
     기억 화면 GET 응답에 `previous_fact`를 넣지 않는다(`select *`가 아닌지 확인). 읽기 쿼리 수정 파일은 없다. 수정 대상:
     - `web/app/api/chat/route.ts` — `fetchMemories` 반환 타입, `extractAndStorePreference`(대체 쿼리 신규, 폴스루)
     - `web/lib/deepseek.ts` — `extractPreferences`(번호 목록 입력, `{fact, replaces}[]` 출력·파싱)
     - 그 밖 `user_preferences` 쿼리(`notices/recommended`, `jobs/notify`, `preferences`, `preferences/[id]`)는 변경 없음.
       구현 전후로 `web/`에서 `user_preferences` SQL 문자열을 다시 검색해
       [[anyang-backend-api#3-3-4. 모순 선호 즉시 정정 — 기존 기억 목록을 추출 호출에 함께 전달 (신규, 2026-10-03, 확인 항목 48, 최종 결정 반영, 재승인 대기)]]
       의 "쿼리 영향 범위" 표와 같은지(대체 쿼리 하나만 새로 생겼는지) 확인한다.
   - 작업 3(프롬프트 사전 테스트, 확정 (h), **구현 단계에서 수행**): 프롬프트 문구를 확정하기 전에 가짜 문장 쌍(모순 6·
     비모순 6 정도, 손으로 쓴 예시, 실제 사용자 데이터·`AI-Sessions/raw/` 원문 금지)으로 실제 DeepSeek를 호출해 `replaces`를
     프롬프트대로 쓰는지 본다(키는 환경변수, 출력·문서에 남기지 않는다). 결과로 문구를 조정하는 것은 설계 3-3-4절에 적힌
     프롬프트 의도("모순일 때만 `replaces`, 불확실하면 `null`") 범위 안에서만 한다. 의도·출력 형식·필드명을 바꾸면
     설계 변경이므로 "설계 변경 필요"로 보고한다. 설계 문서의 초안 문구만으로도 이 테스트 없이 구현할 수 있다. 결과
     (정답률, 조정한 문구)는 구현 보고에 적는다. 이 설계 호출에서는 실행하지 않았다.
   - 이번 범위 밖: 이전 문장 표시 화면·되돌리기 API(되돌리기는 database 문서의 운영자 SQL swap뿐), swap 뒤 임베딩 재계산
     스크립트(f-6, 필요하면 별도 요청), 정리 잡(없음, f-3). 처리방침·기억 화면 문구 정합성은 보류(f-8, frontend 재개
     때 확인).
   - 6-1과 같은 함수(`extractAndStorePreference`)를 건드리지만 6-1이 보류라 지금은 겹치지 않는다. 6-1 재개
     때 게이트를 추출 호출 앞에 얹는다(게이트는 추출 호출 앞, 모순 판단은 추출 호출 안).
   - 테스트: [[anyang-backend-api#테스트 방법]] "모순 선호 정정" 항목 (1)~(13) — 목 기반 단위 테스트, 같은 행 대체와
     `previous_fact` 보관(1)(1-b), `previous_fact` 불변·누출 방지(11), 대체 쿼리 소유자 방어(DB 레벨), 마이그레이션
     순서(12), 사전 테스트(13). 기존 `web/test/deepseek.test.ts`·`web/test/chat.test.ts`의 문자열 배열 기대값 갱신, 그리고
     쿼리 문자열 일부로 분기하는 기존 목(`web/test/chat.test.ts`·`preferences.test.ts`)이 대체 쿼리 추가 뒤에도 맞는지
     확인·갱신 포함.
7. **알림 잡** — `/api/jobs/notify`(시각 창 매칭 + 코사인 유사도 + Web Push 호출,
   `notify_logs` pending 선점·정체 재시도 포함). **다중 기기 발송 판정(신규, 확인 항목 30,
   backend 설계 7절)** — 사용자의 `push_subscriptions` 전체에 전송, 한 대라도 성공하면
   `result='success'`, `failed_device_count`에 실패 기기 수 기록(만료 구독 삭제분 제외).
   3·8번 의존. 중복 발송 방지 방식은 database·backend 조율 완료(backend 설계 7절).
8. **Web Push** — `POST/DELETE /api/push/subscribe`, `web-push` 연동.
9. **스케줄러 공유 시크릿 미들웨어** — `/api/jobs/*` 공통 인증. 4·5·7번이 의존.
10. **환경변수·배포 설정** — `output: 'standalone'`, Vercel 프로젝트 설정(icn1), 9절 환경변수
    실제 값 채우기(비밀 값은 문서에 남기지 않음). `APP_ORIGIN`은 배포 시 Vercel 기본 도메인
    사용, 커스텀 도메인은 나중에(12-1절 절차). `ADMIN_EMAILS`도 이 단위에서 채운다.
11. **UNO Q 전환 runbook 리허설** — 로컬 PostgreSQL 덤프/복원 1회(개발 환경 한정).
12. **관리자 공통 인가** — `requireAdmin` 헬퍼(13-0절, 세션의 `provider === 'google'`
    확인 후 `ADMIN_EMAILS` 파싱·비교, 401/403 — `accounts` 테이블 조회 방식 아님, 2차
    재점검 반영). 1·9번 의존(1번의 `token.provider`/`session` 클레임, 세션·미들웨어 재사용).
13. **관리자 — 공지 수집 관리** — `GET/POST /api/admin/collect-runs`,
    `GET /api/admin/notices`(신규, 확인 항목 23, 숨김 포함·페이지네이션),
    `PATCH /api/admin/notices/:id/hide`·`/unhide`(13-1절). 5·12번 의존. 5번(수집기 로직
    재사용)이 끝난 뒤 착수. `GET /api/admin/notices`는 스키마 변경이 필요 없다(database
    작업 없이 이 단위 안에서 구현).
14. **관리자 — 알림 발송 현황 / 사용자 관리·통계 / 외부 API 사용량** —
    `GET /api/admin/notify-logs/summary`, `GET/PATCH/DELETE /api/admin/users*`,
    `GET /api/admin/stats`, `GET /api/admin/api-usage/summary`(13-2~13-4절). 12번 의존.
    정지 계정 차단(1-2절 미들웨어)은 이 단위에서 함께 구현.
15. **`api_usage_logs` 기록 래퍼** — DeepSeek(6번)·Gemini(3번) 호출 공통 래퍼에 로그 기록 추가.
    3·6번 의존, 14번이 이 데이터를 조회하므로 14번보다 먼저 끝나야 한다.
16. **로그 정리 잡 등록(`collect_runs`/`api_usage_logs` 90일)** —
    [[anyang-database-schema#로그성 테이블 보존 기간·정리 잡]]의 `cleanup-logs` pg_cron
    SQL을 database가 등록한다(app API 엔드포인트 없음, backend 작업 아님). 보존 기간(90일)과
    정리 잡 등록 자체는 이미 승인됐다(user, 2026-09-27, [[anyang-service-scope]]). 다만 이
    항목은 되돌릴 수 없는 삭제를 주기적으로 실행하는 것이므로, 착수 전 이 구현 단계
    지시서에 **이 잡을 지금 실제로 pg_cron에 등록하는 것**에 대한 별도 사용자 승인이 적혀
    있는지 반드시 확인한다(dev-common 규칙 4,
    [[anyang-database-schema#되돌릴 수 없는 마이그레이션 표시]]). 승인 기록이 없으면
    등록하지 않고 멈춰서 보고한다. `notify_logs`는 이 정리 대상이 아니다(확정).
17. **동의 기록(`consents`) 보관 만료분 정리 잡 등록(1년)** —
    [[anyang-database-schema#consents — 가입 시 개인정보 필수 동의 기록]]의
    "탈퇴 후 보관" 절 `delete from consents where withdrawn_at is not null and withdrawn_at
    < now() - interval '1 year'` pg_cron SQL을 database가 등록한다(app API 엔드포인트 없음,
    backend 작업 아님). 보관 기간(1년)은 이미 승인됐다(user, 2026-09-27,
    [[anyang-service-scope]]). 16번과 마찬가지로 되돌릴 수 없는 삭제이므로, 착수 전 이
    구현 단계 지시서에 **이 잡을 지금 실제로 pg_cron에 등록하는 것**에 대한 별도 사용자
    승인이 적혀 있는지 반드시 확인한다. 승인 기록이 없으면 등록하지 않고 멈춰서 보고한다.
    16번과 대상 테이블·보존 기간이 달라 별도 작업 단위로 둔다(YAGNI에 위배되지 않음 —
    합치면 오히려 조건 분기가 늘어난다).

### 순서 제안

3, 9, 12 → (1, 2, 2-1 병렬 가능) → 1-4, 1-5, 2-2, 4, 15 → 6, 8, 2-3 → 7 → 13, 14 → 10, 16, 17. 5는
robots.txt·HTML 구조 확인이 끝나는 대로 별도로 끼워 넣고, 13은 5 이후. 확인 항목 55는 database 0021 적용 →
5-1 → 5-2 → 5-4 → 5-3 순서(5-5 트리거 등록은 사용자 승인 뒤 database)이며 다른 단위와 독립이다. 11은 나머지가 끝난 뒤
여유 있을 때. 16·17은 각 정리 잡 등록에 대한 별도 사용자 승인이 구현 단계 지시서에 먼저
적혀 있어야 착수한다(보존 기간 자체는 둘 다 이미 확정됨).

## 테스트 방법

각 작업 단위의 테스트는 [[anyang-backend-api#테스트 방법]]에 이미 기술돼 있다. 여기서는
중복하지 않는다.

## Links

- [[anyang-backend-api]]
- [[anyang-database-schema]]
- [[anyang-youth-policy-assistant]]
- [[anyang-service-scope]]
