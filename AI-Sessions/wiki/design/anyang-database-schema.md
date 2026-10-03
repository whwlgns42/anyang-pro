---
type: design
date: 2026-09-27
status: active
owner: database
---

# 안양 청년정책 비서 — DB 스키마 설계

## Summary

PostgreSQL + pgvector 위에 사용자/인증, 프로필, 개인정보 동의 기록, 공지(notice)와 그 벡터
조각, 대화, 선호(preference) 벡터, 푸시 구독, 알림 설정 테이블을 둔다. 관리자 기능(수집 이력,
공지 숨김, 알림 발송 로그, 계정 정지, 외부 API 사용량)을 위한 로그성 테이블도 두되 개인별
대화·기억 원문은 담지 않는다. 로그인 실패·가입 시도 제한을 위한 `auth_attempts` 테이블과
알림 발송 시 실패 기기 수를 기록하는 `notify_logs` 컬럼을 둔다. public 테이블 전체에 RLS를
켜고 anon·authenticated 롤의 현재·미래 권한을 회수해 공개 키 접근을 차단한다(`0019_lock_public_api`,
확장성 유지). 스케줄은 Supabase
`pg_cron` + `pg_net`이 앱 API를
호출하는 방식으로 앱 쪽 로직만 트리거한다. 모순으로 대체되는 선호는 같은 행을 UPDATE하되 직전 문장
1단계를 `user_preferences.previous_fact`에 보관해 되돌릴 수 있게 한다(확인 항목 48(f), 사용자 결정 안
2a, 마이그레이션 0020). 공지 전체 수집·즉시 갱신(확인 항목 55)을 위해 `notices`에 `is_pinned`·`image_count`·
`attachments`를 더하고(마이그레이션 0021, draft) 수집 잡을 `collect-quick`(10분)·`collect-full`(하루 1회) 둘로
나눈다. 아래 테이블·컬럼·인덱스 세부는 모두 제안이며
사용자 설계 승인으로 확정됐다.

## Context

- 확정: DB는 PostgreSQL + pgvector ([[anyang-stack-database]]), 배포는 Vercel Hobby(icn1) +
  Supabase 무료(서울, pgvector), 알림 잡 트리거는 pg_cron + pg_net ([[anyang-deployment-portability]]).
- 확정: 외부 AI(DeepSeek·Gemini)에는 식별정보 전송 금지. 임베딩에는 공지 본문·선호 문장만
  전송한다 ([[anyang-ai-models-data-transfer]]).
- 이전 가능성 원칙(반드시 준수, [[anyang-deployment-portability#이전 가능성 원칙 (Vercel+Supabase ↔ UNO Q)]]):
  표준 PostgreSQL+pgvector만 쓰고 Supabase Auth/Storage/Edge Functions/전용 클라이언트를 쓰지
  않는다. `DATABASE_URL`로만 접속한다. 스케줄 로직은 앱 API에 두고 pg_cron+pg_net은 트리거로만
  쓴다. 전환 시나리오는 DB 덤프/복원 + 환경변수 + DNS다.
- 임베딩 모델·차원: 2026-09-27 backend 제안 — Gemini 임베딩 모델 `gemini-embedding-001`,
  `output_dimensionality` 파라미터로 768차원 축소(pgvector HNSW 인덱스 차원 한도와 저장 비용
  고려). 모델이 `output_dimensionality`로 1536/768차원 축소를 지원한다는 사실은 2026-09-27
  메인 세션이 공식 문서로 재확인했다(출처:
  https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings,
  기본 차원 3072, 1536/768 지원). 아래 `notice_chunks`, `user_preferences`의 `embedding`
  컬럼 타입은 `VECTOR(768)`로 표기한다. 모델·차원 선택 자체는 이 설계 문서의 다른 값과
  마찬가지로 사용자 설계 승인으로 확정된다. 모델 교체 시 재임베딩 절차는 아래 별도로 둔다.
- 인증 라이브러리: 2026-09-27 backend 확정 제안 — Auth.js(NextAuth) v5, Credentials
  provider(이메일·비밀번호, bcrypt 해시) + Google OAuth provider 병행. 표준 PostgreSQL 어댑터
  스키마(users/accounts) 중 `verification_tokens`을 제외한 부분 + 자체 `credentials` 테이블
  구성을 쓴다. `verification_tokens`는 쓰지 않는 것으로 확정됐다([[anyang-service-scope]],
  user, 2026-09-27 — 아래 `sessions` 절 참고).
  세션 전략은 JWT(쿠키)로, DB 세션 테이블은 쓰지 않는다 — 이전 가능성 원칙(표준 스키마만 사용)과
  충돌하지 않고 세션 테이블 관리 부담도 없앤다. 아래 테이블 제안은 이 전제로 갱신했다.
  라이브러리·전략 자체는 backend 제안이며 사용자 설계 승인으로 확정된다.
- 관리자 기능: 2026-09-27 user 확정 — 관리자는 DB 역할 컬럼 없이 환경변수 `ADMIN_EMAILS`로만
  지정한다([[anyang-service-scope]]). 관리자 기능 ①~④(공지 수집 관리, 알림 발송 현황, 사용자
  관리·통계, 외부 API 사용량)는 확정이나, 이를 담을 로그성 테이블 구조·컬럼·보존 기간은 모두
  이 문서의 다른 값과 마찬가지로 제안이었으나 확정됐다. 관리자 화면에서도 개인별 대화·기억 원문은
  보이지 않는다(집계·메타데이터만) — 이 원칙에 따라 아래 로그 테이블은 대화 내용을 담지 않는다.
- **2026-09-28 개정(확인 항목 29·30, [[anyang-youth-policy-assistant#확인이 필요한 항목]])**:
  로그인 실패는 같은 이메일 또는 같은 IP 기준 15분에 5회 초과, 회원가입 시도는 같은 IP
  15분에 5회 초과 시 일시 차단(확정, user, 2026-09-28) — 외부 서비스 없이 DB 기록 방식으로
  판정한다(확정). 비밀번호 최소 8자(확정, 검증은 backend). 알림 발송은 사용자가 등록한 기기
  (구독) 중 한 대라도 성공하면 `notify_logs.result='success'`로 보고, 실패한 기기 수를 함께
  기록한다(확정, user, 2026-09-28). 이를 담을 새 테이블(`auth_attempts`)과 `notify_logs`
  컬럼 추가는 이 문서의 다른 값과 마찬가지로 제안이었으나 확정됐으며, 새 마이그레이션(0017·0018)
  계획을 아래에 둔다.

## Details

### 용어

이 문서의 표는 [[glossary]]의 도메인 용어(user, profile, notice, preference, notify-time,
conversation, push-subscription, collect-job, notify-job)를 그대로 쓴다. 새 용어는 추가하지 않았다.

### 테이블 제안

#### users

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| email | text, unique, not null | |
| email_verified | timestamptz, null 허용 | Auth.js 어댑터 규격 |
| name | text, null 허용 | 화면 표시용, 필수 아님(개인정보 최소화) |
| created_at | timestamptz, default now() | |
| suspended_at | timestamptz, null 허용 | 관리자가 계정을 정지한 시각. null이면 정상 상태(제안). 정지 사유를 남길지는 미확정 — 필요하면 별도 컬럼(예: `suspended_reason text`) 추가(되돌릴 수 있는 마이그레이션) |

- **정지 계정 처리 방식**: [[anyang-backend-api#1-2. 정지 계정 제한 방식]]에서 정리한다 — 로그인은 허용, 제한
  상태(제안). 알림(notify-job)은 `suspended_at`이 not null인 사용자를 조회 대상에서
  제외한다(아래 pg_cron 절 쿼리, `u.suspended_at is null` 조건). 정지는 로그인 계정(`users`)
  단위이므로 `credentials`/`accounts`를 따로 건드리지 않는다.
- **계정 삭제**는 이 컬럼과 무관하게 기존 cascade 정책(위 각 테이블 `on delete cascade`)을 그대로
  따른다 — `users` 행 삭제 시 profiles/accounts/credentials/conversations/push_subscriptions/
  notify_settings/user_preferences가 함께 삭제된다. `consents`만 예외다 — `on delete set null`이므로
  `users` 행이 삭제돼도 `consents` 행은 남는다(증빙 보관 목적, 아래 `consents` 절 참고). 탈퇴
  처리 순서(애플리케이션 책임, 제안): ① `consents.withdrawn_at` 채우기 → ② `users` 행 삭제(나머지
  cascade 테이블은 이때 함께 삭제됨).

#### accounts — OAuth 연동, Auth.js 어댑터 규격 기본안

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete cascade | |
| provider | text, not null | 예: `google` |
| provider_account_id | text, not null | |
| access_token / refresh_token / expires_at | text/text/bigint, null 허용 | Auth.js 표준 컬럼. 값 저장 여부는 백엔드가 필요로 하는 범위만 |

- unique(provider, provider_account_id)

#### sessions — 미사용 (JWT 전략)

Auth.js 어댑터 기본 스키마에는 `sessions` 테이블이 있지만, 세션 전략을 JWT(쿠키)로 쓰기로 해
DB에 세션을 저장하지 않는다. 이 문서에는 `sessions` 테이블을 두지 않는다. `verification_tokens`
(이메일 인증·비밀번호 재설정 등에 쓰는 Auth.js 표준 테이블)는 쓰지 않는다 — 확정
([[anyang-service-scope]], user, 2026-09-27). 이메일 인증·비밀번호 재설정 흐름이 필요해지면
이 확정을 먼저 뒤집어야 하므로 backend가 그 기능을 설계에 넣으려면 설계 변경으로 다시 승인을
받는다.

#### credentials — 자체 회원가입(이메일·비밀번호)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_id | uuid, PK, FK → users.id, on delete cascade | |
| password_hash | text, not null | bcrypt/argon2 등 backend가 정함. 평문 저장 금지 |
| updated_at | timestamptz | |

- Auth.js 표준 스키마에는 없는 테이블이라 backend가 자체 credentials provider를 쓸 때만 필요.
  backend 조율에서 최종 확정.
- **비밀번호 최소 길이(확정, 8자, [[anyang-youth-policy-assistant#확인이 필요한 항목]] 29,
  user, 2026-09-28)**: 이 테이블 스키마와 무관하다 — `password_hash`는 해시만 저장하므로
  길이 컬럼이나 제약을 두지 않는다. 최소 8자 검증은 회원가입 API가 해시하기 전에 수행한다
  (애플리케이션 책임, backend 소관).

#### auth_attempts — 로그인 실패·가입 시도 제한 (신규, [[anyang-youth-policy-assistant#확인이 필요한 항목]] 29)

로그인 실패는 같은 이메일 또는 같은 IP 기준 15분에 5회 초과, 회원가입 시도는 같은 IP
15분에 5회 초과 시 일시 차단하는 것은 확정이다(user, 2026-09-28). 외부 서비스(Redis,
rate-limit SaaS 등) 없이 DB 기록만으로 판정하는 것도 확정이다. 아래 테이블 구조·해시 방식·
판정 쿼리·보존 방식은 이 문서의 다른 신규 값과 마찬가지로 제안이었으나 확정됐다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| attempt_type | text, not null | `login_failure` / `signup_attempt`. 값 셋은 제안 |
| identifier_type | text, not null | `email` / `ip`. 값 셋은 제안 |
| identifier_hash | text, not null | 판정 대상 값(이메일 또는 IP)의 해시. 아래 "원값/해시 선택" 참고 |
| created_at | timestamptz, not null, default now() | 시도 시각 |

- 인덱스: `(attempt_type, identifier_type, identifier_hash, created_at)` — 창 안 횟수를
  세는 조회에 쓴다(제안).
- **원값/해시 선택 (제안)**: 개인정보 최소화 관점에서 이메일·IP 원값 대신 SHA-256
  해시(`sha256(lower(trim(email)))`, `sha256(ip_text)`)로 저장한다 — 판정에는 "같은 값인지"
  비교만 필요하고 원값 복원이 필요 없다(단방향 해시로 충분). `identifier_type='email'`이면
  판정 시점에 로그인 시도에 쓰인 이메일을 같은 해시 함수로 계산해 비교하면 되므로, 관리자가
  특정 이메일·IP의 최근 시도를 찾아야 할 때도 같은 방식으로 재계산해 대조할 수 있다(원값이
  없어도 조회 가능). IP는 `inet` 대신 `text` 해시로 저장해 IPv4/IPv6 형식 차이를 신경 쓰지
  않는다(제안).
- **판정 쿼리 예시 (제안)**:
  ```sql
  -- 최근 15분 내 실패(또는 시도) 횟수. 로그인은 identifier_type을 'email'과 'ip' 각각
  -- 조회해 둘 중 하나라도 5회 초과면 차단. 가입은 identifier_type='ip'만 조회.
  select count(*) from auth_attempts
  where attempt_type = $1        -- 'login_failure' 또는 'signup_attempt'
    and identifier_type = $2     -- 'email' 또는 'ip'
    and identifier_hash = $3
    and created_at > now() - interval '15 minutes';
  ```
- **기록 방식 (제안)**: 로그인 실패마다(비밀번호 불일치, 존재하지 않는 이메일 등)
  `identifier_type='email'`·`identifier_type='ip'` 각각 1행씩(총 2행) 기록해 이메일 기준·IP
  기준 판정을 독립된 행으로 센다. 회원가입 시도는 성공·실패와 무관하게 매
  `POST /api/auth/register` 호출마다 `identifier_type='ip'` 1행을 기록한다(제안 — 스팸성
  대량 가입 자체를 막는 목적이므로 성공한 가입도 횟수에 포함한다). 로그인 성공 시에는 행을
  남기지 않는다(제안 — 정상 사용자의 반복 로그인이 차단에 영향을 주지 않게 하기 위함).
  차단 여부 판정 시점(요청 처리 전 사전 확인 vs. 실패 확정 후 기록)과 정확한 처리 순서는
  backend가 구현 단계에서 정한다.
- **차단 지속 시간 (제안)**: 별도 "차단 해제 시각" 컬럼을 두지 않고 슬라이딩 윈도우로
  계산한다 — "15분 안에 5회 초과"라는 조건이 매 요청 시점에 재평가되므로, 가장 오래된 초과
  유발 시도가 15분을 넘어가면 자연히 차단이 풀린다. 차단 중에도 계속 시도하면 새 행이 쌓여
  차단이 연장된다(의도된 동작, 제안).
- 응답 코드·메시지(예: 429 여부, 에러 코드 문자열)는 backend 제안이다
  ([[anyang-backend-api#1-4. 403 응답 에러 코드]]와 같은 방식으로 코드를 추가할 수 있다).
- **보존·정리 (제안, 되돌릴 수 없는 삭제)**: 판정에 필요한 창이 15분뿐이므로 오래
  보관할 이유가 적다. `collect_runs`/`api_usage_logs`와 같은 방식(pg_cron 트리거)으로 1일
  보존 후 정리한다(제안 — 15분보다 길게 두어 관리자가 최근 차단 이력을 잠깐 확인할 여유는
  남기되, 개인정보 최소화 원칙에 따라 기존 로그 90일보다 훨씬 짧게 잡는다).
  ```sql
  -- 제안: 매시간 1일 지난 인증 시도 기록 정리 (보존 1일은 제안, 실행 주기·시각도 제안)
  select cron.schedule(
    'cleanup-auth-attempts',
    '0 * * * *',
    $$ delete from auth_attempts where created_at < now() - interval '1 day'; $$
  );
  ```
  이 정리 잡도 데이터 삭제이므로 되돌릴 수 없는 마이그레이션 취급이다(dev-common.md 규칙).
  구현 단계 지시서에 이 정리 잡 등록에 대한 사용자 승인이 별도로 적혀 있어야 실행한다 —
  없으면 등록하지 않고 멈춰서 보고한다(위 `consents`/`cleanup-logs`와 동일한 규칙).

#### profiles (항목 범위·코드값 셋·컬럼 타입 모두 확정)

프로필 항목 범위는 생년·성별·직군·재학/재직 여부 4개로 확정됐다([[anyang-service-scope]],
user, 2026-09-27). 소득 등 그 외 항목은 두지 않는다. `gender`/`enrollment_status`/
`occupation_type`의 코드값 셋도 [[anyang-service-scope#Details]]("프로필 선택지" 행)에서
user가 2026-09-27에 확정했다 — 값 목록은 그 결정 문서를 원본으로 삼고 여기서는 중복 기재하지
않는다. 컬럼 타입(text 등)과 not null 여부 같은 스키마 세부만 이 문서의 제안이다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_id | uuid, PK, FK → users.id, on delete cascade | |
| birth_year | smallint, null 허용 | 나이대 계산용. 생년월일 전체 저장은 개인정보 최소화 관점에서 비권장(제안) |
| gender | text, null 허용 | 선택값. 코드값 셋은 [[anyang-service-scope#Details]] 확정 참고 |
| enrollment_status | text, null 허용 | 재학/재직/구직 등 상태([[glossary]]). 코드값 셋은 [[anyang-service-scope#Details]] 확정 참고 |
| occupation_type | text, null 허용 | 업종·직무 성격. `enrollment_status`와 값이 겹치지 않는다. 코드값 셋은 [[anyang-service-scope#Details]] 확정 참고 |
| updated_at | timestamptz | |

- 개인정보 최소화 관점 선택지(제안):
  1. 모든 프로필 항목은 null 허용으로 두어 미입력 시에도 서비스 이용 가능하게 한다(강제 입력 최소화).
  2. 항목을 더 늘려야 하면 `ALTER TABLE ADD COLUMN`(되돌릴 수 있는 마이그레이션)으로 추가한다.
    단, 항목 범위 자체를 늘리는 것은 [[anyang-service-scope]] 확정을 뒤집는 것이므로 설계 변경
    절차(재승인)를 거친다.
- **코드값 셋 (확정, [[anyang-service-scope]], user, 2026-09-27)**: "직군"(`occupation_type`)과
  "재학/재직 여부"(`enrollment_status`)는 사용자가 별도 항목으로 정했으므로 코드값이 서로
  겹치지 않게 나뉘어 있다. 값 목록은 [[anyang-service-scope#Details]]를 참고한다(값 중복
  기재를 피하기 위해 이 문서에는 옮겨 적지 않는다). 참고로 `enrollment_status`에는 기존
  제안값 `none` 대신 `other`(기타)가 확정됐고, `job_seeking`은 "구직·미취업"을 뜻한다.
  재학생·미취업자처럼 직군이 없는 사용자는 `occupation_type` 컬럼이 null 허용이므로 값을 넣지
  않는다(제안) — null이 "해당 없음"을 의미하므로 별도 코드값을 쓰지 않는다. 구직자는
  `enrollment_status='job_seeking'`이면서 `occupation_type`은 null인 조합을 기본으로 본다(제안).
  두 항목을 함께 쓰는 근거(정책 공고가 실제로 이 조합으로 자격 조건을 나눈다는 것)는 확인된
  출처가 없는 추정이다(근거: 추정) — 스키마 확정과 별개로 남는 참고 메모다.

#### notices — 공지 자격요건 구조화 컬럼 없음(확정)

공지 자격요건(연령·직군 등 조건)을 구조화된 컬럼으로 저장하지 않는 것은 1차 출시 범위로
확정됐다([[anyang-service-scope]], user, 2026-09-27). 아래 표에 그런 컬럼을 두지 않는다 —
자격요건 판단은 `body`(본문 텍스트)와 벡터 검색·LLM 판단에 맡긴다(애플리케이션 책임).

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| source_url | text, unique, not null | 원문 URL |
| title | text, not null | |
| body | text, not null | 본문. 임베딩 입력으로 쓰인다 |
| content_hash | text, not null (unique 아님, 0021에서 해제) | 본문(또는 제목+본문) 해시. 수정 감지용이며 중복 판정에는 쓰지 않는다 |
| published_at | timestamptz, null 허용 | 게시일. 게시판에 없으면 null |
| collected_at | timestamptz, default now() | |
| hidden_at | timestamptz, null 허용 | 관리자가 잘못 수집된 공지를 숨긴 시각. null이면 정상 노출(제안, [[glossary]]의 notice-hidden) |
| hidden_reason | text, null 허용 | 숨김 사유(관리자가 입력, 필수 아님) |
| is_pinned | boolean, not null, default false | 게시판의 고정 공지 여부(별표 표시, 0021, 확인 항목 55). 판정 규칙은 backend가 실제 HTML을 보고 확정한다 |
| image_count | int, not null, default 0 | 본문 이미지 수("본문 이미지" 배지, 0021). 정의(본문 `<img>`만인지 이미지 첨부 포함인지)는 확인 항목 55-c, 사용자 확인 대기 |
| attachments | jsonb, not null, default '[]' | 첨부 목록 `[{name, url}]`, 링크만 저장하고 파일은 복사하지 않는다(0021) |

- **확인 항목 55 컬럼 3개 (확정, 사용자 결정 2026-10-04, 계획서 승인)**: 위 `is_pinned`·`image_count`·
  `attachments`와 기본값은 확정이다. 게시판 번호(bbsNo) 컬럼은 쓸 곳이 없어 두지 않는다. 기존 행(현재 notices
  0건)은 기본값으로 채워진다. 이전의 "고정 공지·본문 이미지는 뺀다"는 서술은 이 결정으로 대체된다
  ([[anyang-service-scope]] "공지 화면 표시" 행). `attachments`의 원소 키는 `name`·`url` 두 개이며 jsonb 구조
  검증 제약(check)은 두지 않는다(제안, 값 형식 검증은 수집기 몫). 인덱스는 추가하지 않는다 — 세 컬럼 모두
  where 조건으로 쓰이지 않고 정렬 보조(`is_pinned desc`)는 462건 규모라 불필요하다(제안, 정렬 쿼리는 backend).
- **인덱스·중복 판정 (확정, 사용자 결정 2026-10-04, 확인 항목 55-j)**: 중복 판정은 `source_url`의 unique 제약
  (`notices_source_url_key`)만 쓴다. `content_hash`의 unique 제약(`notices_content_hash_key`, 0005에서 컬럼 인라인
  `unique`로 생성됨, 운영 DB에서 이름 확인)은 0021에서 푼다. 이유: 게시판 462건 중 본문이 같은 서로 다른 글이 있어
  해시 unique가 insert를 막기 때문이며, 462건이 모두 들어와야 한다. 해시는 같은 `source_url`의 본문이 바뀌었는지
  (수정 감지) 비교하는 값으로만 남긴다. `content_hash` 일반 인덱스는 두지 않는다 — 수정 감지는 `source_url`로 행을
  찾은 뒤 그 행의 해시를 비교하므로 해시로 검색하지 않는다(제안, backend가 해시로 조회하는 쿼리를 쓰게 되면 알려
  달라).
- **숨김 처리와 추천·검색 제외 (제안)**: `hidden_at is not null`인 공지는 사용자 노출·추천·
  벡터 검색 결과에서 제외한다. 두 가지 구현 방식 중 하나를 backend가 고른다.
  1. 매 조회 쿼리(추천 목록, `notice_chunks` 벡터 유사도 검색의 조인 대상)에 `notices.hidden_at
     is null` 조건을 추가한다 — 스키마 변경 없이 애플리케이션/쿼리 책임으로 끝난다(제안, 별도
     마이그레이션 불필요).
  2. 숨김 시 `notice_chunks`에서 해당 `notice_id`의 행을 물리 삭제해 검색 인덱스에서 완전히
     제거한다 — 다시 숨김 해제하면 재임베딩이 필요해 되돌리기 비용이 크므로 권장하지 않는다(제안).
  기본안은 1번이다. 최종 선택은 backend 조율 후 확정한다.

#### notice_chunks — 벡터 검색용

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| notice_id | uuid, FK → notices.id, on delete cascade | |
| chunk_text | text, not null | 공지 본문을 나눈 조각. 통째로 넣을지 분할할지는 미확정 |
| embedding | VECTOR(768) | `gemini-embedding-001`을 `output_dimensionality=768`로 축소한 값(공식 문서 확인 완료, 위 Context 참고) |
| embedding_model | text, not null | 예: `gemini-embedding-001`. 모델 교체 이력 추적용 |
| created_at | timestamptz, default now() | |

- 인덱스: HNSW(embedding) — pgvector의 `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`
  (코사인 유사도 제안).
- **모델 교체 시 재임베딩 절차 (제안)**:
  1. 새 모델명을 `embedding_model`에 구분해 새 행으로 추가하거나, 배치 잡으로 전체 재계산 후
     `embedding_model` 값을 일괄 갱신한다(어느 쪽이든 서비스 중단 없이 진행 가능하도록 컬럼에
     모델명을 남긴다).
  2. 차원이 달라지면 `VECTOR(n)` 컬럼 타입 자체를 바꿔야 하므로 새 컬럼을 추가하고 재계산이
     끝난 뒤 기존 컬럼을 지우는 방식을 쓴다(컬럼 타입을 바로 ALTER하면 기존 벡터가 무의미해짐).
  3. HNSW 인덱스는 재계산이 끝난 뒤 새로 만든다(오래 걸리는 재구축 작업이므로 배치 시간대에).

#### conversations / messages

대화 히스토리 목록 화면([[anyang-service-scope]], user, 2026-09-27 확정)이 있어야 하므로
`conversations`에 목록 표시용 컬럼을 둔다.

| 테이블 | 컬럼 | 설명 |
|---|---|---|
| conversations | id uuid PK, user_id uuid FK→users.id, title text null 허용, created_at, updated_at | 대화 한 묶음. `title`은 목록 화면에 보여줄 제목(자동 생성 방식은 backend가 정함, 예: 첫 메시지 요약). `updated_at`은 마지막 메시지 시각으로 갱신(애플리케이션 책임) |
| messages | id uuid PK, conversation_id uuid FK→conversations.id, role text(user/assistant), content text, created_at | 개별 발화 |

- 인덱스: `(user_id, updated_at desc)` — 대화 목록을 최근 순으로 조회할 때 사용.
- DeepSeek로 보내는 값은 조건(나이대·성별·직군)뿐이라는 원칙([[anyang-ai-models-data-transfer]])은
  앱 코드에서 지킨다. `messages.content`에 식별정보를 넣지 않는 것은 스키마가 아니라 애플리케이션
  책임이므로 이 설계에서 강제하지 않는다(참고로 남김).
- **채팅 사용자 메시지 임베딩 저장 여부 (제안)**: 사용자 메시지를 Gemini로 임베딩해 채팅
  RAG 검색에 쓰는 것은 허용됐다([[anyang-ai-models-data-transfer]], user, 2026-09-27). 이
  임베딩은 그 요청의 검색 쿼리 벡터로 한 번만 쓰이고 재사용되지 않으므로(공지·선호 임베딩처럼
  나중에 다시 유사도 검색할 대상이 아니다), `messages`에 별도 `embedding` 컬럼을 두거나 별도
  테이블에 저장하지 않는다(제안) — 요청 처리 중 메모리에서만 계산해 쓰고 버린다. 저장하면
  개인정보 최소화 원칙에도 어긋나고(대화 내용의 벡터 표현이 영구히 남음), YAGNI에도 맞지
  않는다(검색 후 재사용 계획 없음). 나중에 과거 메시지 유사도 검색이 필요해지면 컬럼 추가로
  대응하되, 이는 새 요구사항이므로 별도 설계 변경으로 다룬다.

#### user_preferences — 대화에서 추출한 선호, 벡터. "AI가 기억하는 내 정보" 화면의 데이터

"AI가 기억하는 내 정보" 화면은 조회·수정·삭제를 지원한다([[anyang-service-scope]], user,
2026-09-27 확정). 삭제는 행 삭제(DELETE)로 충분하다(직전 문장 `previous_fact`가 같은 행에 있어 함께 삭제된다, 아래 "이력 보관 구조"). 수정은 `preference_text`를 사용자가
고쳐 쓰는 것이므로 `updated_at`을 둔다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete cascade | |
| preference_text | text, not null | 추출(또는 사용자 수정)된 선호 문장. Gemini 임베딩 입력(식별정보 없이 문장만) |
| embedding | VECTOR(768) | notice_chunks와 같은 모델·차원을 따른다 |
| embedding_model | text, not null | |
| source_conversation_id | uuid, FK → conversations.id, null 허용 | 어느 대화에서 추출됐는지 추적. 사용자가 직접 추가한 항목이면 null |
| created_at | timestamptz, default now() | |
| updated_at | timestamptz, default now() | 사용자가 `preference_text`를 수정할 때마다 갱신 |
| previous_fact | text, null 허용 (0020) | 모순으로 대체되기 직전의 `preference_text` 1단계. null이면 대체된 적 없음. 아래 "이력 보관 구조" |

- 인덱스: HNSW(embedding). `previous_fact`(0020) 때문에 새 인덱스는 추가하지 않는다(아래 "조회 쿼리 2종"의 인덱스 항목).
- **수정 시 재임베딩 필요(제안)**: `preference_text`는 의미 기반 검색(코사인 유사도)의 입력이므로,
  텍스트를 고치면 `embedding`을 반드시 다시 계산해 함께 갱신한다. 텍스트만 바꾸고 `embedding`을
  갱신하지 않으면 검색 결과가 실제 문장과 어긋난다. 이 재계산은 행 하나 단위라 재임베딩 절차
  (아래 `notice_chunks`의 모델 교체 절차)와 달리 컬럼 구조 변경이 없어 되돌릴 수 없는 마이그레이션이
  아니다 — 애플리케이션이 UPDATE 시점에 동기로 처리한다(backend 설계에서 확정).

- **채팅 기억 자동 추출 시 모순 대체·중복 방지·갱신 (신규 2026-09-29, 확인 항목 43; 개정
  2026-10-03, 확인 항목 47-a 결정·48 — 모순 선호 즉시 정정, 직전 문장 보관(48(f), 안 2a))**: 매 AI 답변마다
  "새로 알게 된 사실" 문장 0~N개가 생긴다. 각 문장은 아래 세 경로를 **이 순서로** 시험하고 처음 맞는 경로
  하나만 실행한다(사용자 확정, 2026-10-03, user — [[anyang-youth-policy-assistant#확인이 필요한 항목]]
  47-a·48).
  1. **모순 대체(직전 문장 보관)**: 추출 LLM이 이 문장과 모순되는 기존 기억의 id를 지정하면, **그 행을
     그대로 UPDATE**해 `preference_text`를 새 문장으로 바꾸고 바뀌기 전 문장을 `previous_fact`에 옮긴다(아래
     "대체 쿼리"). **기억 id는 바뀌지 않는다.** 예: 기억 "취업 준비 중"에 새 사실 "회사에 다닌다" → 같은 행의
     `preference_text`가 "회사에 다닌다", `previous_fact`가 "취업 준비 중"이 된다. 거리가 멀어(실측
     0.16~0.18) 유사 갱신으로는 못 잡던 경우다.
  2. **유사 갱신**: id 지정이 없고, 같은 사용자의 기억 중 가장 가까운 것의 거리가 `0.08` 미만이면
     그 행을 덮어쓴다(UPDATE, 기존 로직, 아래 "갱신 쿼리"). 같은 사실의 표현만 다른 경우라 `previous_fact`를
     바꾸지 않는다(사용자 결정 f-2, 이력은 모순 대체에만).
  3. **추가**: 둘 다 아니면 새 행을 INSERT한다.

  임계 완화(거리 기준을 늘려 모순까지 병합)와 만료·최신 우선 정책은 채택하지 않는다(user,
  2026-10-03). **직전 문장 보관은 사용자 확정(user, 2026-10-03, 확인 항목 48(f-1) 안 2a)** — 이전에 제안한
  "이력 미보관"(1차 draft)과 "옛 행 비활성 표시 + 새 행 INSERT"(안 1, `superseded_at`/`superseded_by`)는 채택하지
  않는다. 이 결정으로 **스키마 변경이 생긴다**(`user_preferences`에 `previous_fact` 컬럼 1개, 새 마이그레이션
  0020, 아래 "마이그레이션 계획 (0020)"). 0020 이름·컬럼 이름 `previous_fact`는 사용자 예시를 따른 제안이다.
  - **임계값 (확정, 2026-09-29 승인, 확인 항목 43)**: 코사인 유사도 0.92 이상이면 같은 사실로 보고
    갱신한다. pgvector의 `<=>` 연산자(`vector_cosine_ops`)는 코사인 거리(`1 - 코사인유사도`)를
    반환하므로, 쿼리에서는 거리 `0.08` 미만으로 비교한다(구현 `PREFERENCE_UPDATE_DISTANCE_THRESHOLD`).
    이 값은 2경로(유사 갱신)에만 쓴다. 1경로(모순 대체)는 거리를 보지 않고 LLM이 지정한 id만 본다.
  - **갱신 쿼리 (확정, 2경로. 쿼리 변경 없음)**: 가장 가까운 기존 기억 1행을 찾아 임계값 안이면 그 자리에서
    갱신한다. **`previous_fact`는 SET 목록에 없으므로 그대로 둔다**(사용자 결정 f-2). 행이 비활성으로 나뉘지
    않으므로 활성 조건은 필요 없다.
    ```sql
    -- $1 = user_id, $2 = 새 문장, $3 = 새 embedding, $4 = embedding_model, $5 = source_conversation_id
    update user_preferences
    set preference_text = $2,
        embedding = $3,
        embedding_model = $4,
        source_conversation_id = $5,
        updated_at = now()
    where id = (
      select id from user_preferences
      where user_id = $1
      order by embedding <=> $3
      limit 1
    )
    and (embedding <=> $3) < 0.08  -- 코사인 거리 임계값. 유사도 0.92에 대응
    returning id;
    ```
    `UPDATE ... RETURNING`이 0행이면(가장 가까운 기억도 임계값 밖이거나 기억이 아예 없음)
    애플리케이션이 이어서 `INSERT`한다(별도 `INSERT ... ON CONFLICT`는 쓰지 않는다. 유사도
    비교는 유니크 제약으로 표현할 수 없어 애플리케이션이 UPDATE 시도 후 실패하면 INSERT하는
    2단계 방식이 맞다).
  - **추출 프롬프트용 기존 기억 목록 조회 (신규 2026-10-03, 제안)**: LLM이 모순 대상을
    지정하려면 기억의 id와 문장을 함께 봐야 한다. 현재 "조회 쿼리 2종"(아래)이 이미 `id`,
    `preference_text`를 돌려주므로, backend가 채팅 요청 때 조회한 합집합(최근 N + 유사 K)에서 문자열만
    쓰던 것을 `{id, preference_text}` 쌍으로 쓰면 **추가 쿼리가 없다**. `previous_fact`는 목록에 싣지
    않는다(프롬프트에 직전 문장은 필요 없다). 목록을 그보다
    넓히고 싶으면(예: 전체) "최근 기억 N개" 쿼리의 `limit $2`만 키운 다음 형태를 쓴다. 개수는 backend가
    정하며([[anyang-backend-api#3-3-1. 요약/추출 프롬프트 문구 변경 (신규, 2026-09-29, 확인 항목 43)]]),
    이 문서는 값을 정하지 않는다.
    ```sql
    -- $1 = user_id, $2 = 목록 최대 개수(backend 결정)
    select id, preference_text
    from user_preferences
    where user_id = $1
    order by updated_at desc
    limit $2;
    ```
    **제한 없는 `select` 금지** — 이 설계는 사용자당 행 수에 상한이 없으므로(아래 "행 수 상한")
    전체 조회라도 `limit`을 둔다. 목록에 없는 기억은 LLM이 모순 대상으로 지정할 수 없다. 그 기억과
    모순되는 새 사실은 2경로·3경로로 간다(즉 정정되지 않고 공존할 수 있다). 이 한계는 목록 개수
    선택의 대가이며 backend가 목록 개수를 정할 때 판단할 사항이다.
    프롬프트에 uuid 36자를 그대로 쓰면 토큰이 늘고 LLM이 id를 옮겨 적다 틀릴 수 있다. 목록 순번
    (1..N)을 프롬프트에 쓰고 애플리케이션이 순번을 id로 되돌리는 방식을 권한다(제안, 선택은
    backend). 이 방식이면 "목록에 없는 id"가 구조적으로 나오지 않는다.
  - **대체 쿼리 (개정 2026-10-03, 1경로 — 같은 행 UPDATE + 직전 문장 보관, 안 2a)**: LLM이 지정한 id의 행을
    새 문장으로 덮어쓰면서 바뀌기 전 `preference_text`를 `previous_fact`로 옮긴다. **한 문장의 UPDATE 하나**라
    원자적이고, 앱이 트랜잭션 클라이언트를 따로 쓸 필요가 없다(현재 코드는 `pool.query` 단발 호출). **`user_id`
    조건을 반드시 함께 건다.** id는 LLM 출력이므로(프롬프트 주입이나 환각으로) 다른 사용자의 id가 나와도 이
    쿼리가 그 행을 건드리지 못해야 한다. 이 조건이 DB 쪽 마지막 방어선이다.
    ```sql
    -- $1 = LLM이 지정한 기억 id, $2 = user_id(세션에서 온 값, LLM 출력 아님), $3 = 새 문장(maskPii 적용 후),
    -- $4 = 새 embedding, $5 = embedding_model, $6 = source_conversation_id
    update user_preferences
       set previous_fact = preference_text,   -- SET 우변은 이 문장이 시작될 때의 옛 값을 본다
           preference_text = $3,
           embedding = $4,
           embedding_model = $5,
           source_conversation_id = $6,
           updated_at = now()
     where id = $1 and user_id = $2
    returning id;
    ```
    - **SQL 검증 상태**: 이 세션에서는 실행해 확인하지 못했다(로컬 PostgreSQL 없음, 설계 단계라 원격 DB에
      적용하지 않음). `previous_fact = preference_text`가 같은 문장 안에서 `preference_text = $3`보다 먼저
      쓰여도 옛 값을 가져온다는 점은 PostgreSQL 문서의 UPDATE 규칙(SET 우변의 컬럼 참조는 갱신 전 행 값을 본다)에
      기댄 설명이며, **실행 확인은 구현 때** 개발 환경 또는 `begin; … rollback;`으로 한다(테스트 ①).
    - **결과 해석**: 반환 행이 1개면 그 `id`가 대체된 기억이다 — **요청한 id와 같다**(행이 그대로이므로). 0행이면 대체가
      일어나지 않은 것이다 — 아래 0행 원인과 폴스루. backend가 반환 id를 쓰는 곳이 있다면 값이 바뀌지 않는다
      (안 1이었다면 새 행 id였을 것이다).
    - 컬럼 처리: **`preference_text` → `previous_fact`로 옮기고, 그 외 `preference_text`·`embedding`·`embedding_model`·
      `source_conversation_id`·`updated_at`을 새 값으로 바꾼다.** `id`·`user_id`·`created_at`은 그대로다. 새 문장은
      `maskPii` 적용 후 임베딩해 넣는다(문장당 임베딩 1회, 2경로·3경로와 같다). `source_conversation_id`는 이번
      대화(어느 대화에서 정정됐는지 추적), `updated_at = now()`라 최근 기억 조회 상위로 올라온다.
    - **직전 임베딩은 보관하지 않는다**(사용자 결정은 "직전 문장만"). `embedding`은 항상 현재 `preference_text`의
      것이다. 되돌릴 때 임베딩 재계산이 필요하다(아래 "되돌리기").
    - 0행 반환 가능 원인 셋: ① 사용자가 기억 화면에서 그 기억을 삭제한 직후(요청 사이 레이스),
      ② 다른 사용자의 id나 존재하지 않는 id(환각·주입), ③ id 형식이 uuid가 아니면 `id = $1`의 uuid 변환이
      오류(`invalid input syntax for type uuid`)를 던진다(0행이 아니라 오류). ③은 애플리케이션이 "목록에 보여 준 id
      집합에 있는지"를 먼저 확인하면 쿼리 전에 걸러진다(순번 방식이면 자동). 오류는 이 문장만 건너뛰는 기존
      `catch`로 처리된다(구현 `extractAndStorePreference`). 안 1에 있던 "이미 대체된 행" 원인은 없다 — 대체된 행도 같은
      행이라 다시 대체될 수 있다(아래 "같은 id 두 번").
  - **대체 대상이 사라진 경우의 처리 (사용자 결정 e, 2026-10-03)**: 대체 쿼리가 0행이면
    **그 문장을 버리지 않고 2경로(유사 갱신)로 넘긴다.** 사용자가 방금 한 말에서 나온 새 사실이므로
    옛 기억이 없어졌다고 해서 새 사실까지 잃으면 안 된다. 2경로 거리 검사도 맞지 않으면 3경로로
    INSERT한다(코드는 `if (replaceResult.rows.length === 0) → 유사 갱신 시도 → INSERT` 폴스루 한 단계).
  - **같은 id가 한 추출 결과에서 두 번 지정된 경우 (사용자 결정 g, 2026-10-03)**: 첫 문장만 1경로로 대체하고
    나머지는 id 지정이 없는 것으로 보고 2·3경로로 보낸다. 이 정리는 backend 파싱 단계의 몫이다. 쿼리 쪽은 같은
    행이 다시 대체되면 `previous_fact`가 첫 대체의 새 문장으로 덮여 원래 옛 문장이 사라지므로(1단계만 보관),
    쿼리가 이를 막아 주지 않는다. 그래서 파싱 단계의 정리가 필요하다.
  - **대체 시 유사 중복 (허용)**: 1경로는 거리 검사를 건너뛴다. 대체한 새 문장이 다른 기억과
    `0.08` 미만으로 가까우면 두 행이 비슷한 문장으로 공존한다. UPDATE는 가장 가까운 **한 행만**
    덮어쓰므로 이후 추출에서도 나머지 한 행은 자동으로 합쳐지지 않는다(사용자가 기억 화면에서 지울 수
    있다). 모순 정정이 드문 경로이고 발생 조건이 좁아 별도 병합 쿼리는 두지 않는다(제안).
  - **동시 요청 레이스 (제안, 허용)**: 같은 사용자가 정확히 동시에 답변 2개를 받는 경우는 실제로
    드물다(한 사용자가 한 번에 대화 하나만 진행). 같은 순간에 유사한 문장 2개가 동시에 INSERT되면
    행이 중복된 채 남을 수 있고, UPDATE는 가장 가까운 한 행만 덮어쓰므로 이후 추출 때 자동으로
    합쳐진다고 기대하지 않는다(중복 행 하나가 남아도 사용자가 기억 화면에서 지울 수 있다). **같은
    id를 동시에 대체하는 경우**는 단일 UPDATE라 행 잠금으로 직렬화되어 나중 쪽이 앞 쪽이 커밋한 값을 기준으로
    덮는다(PostgreSQL 기본 격리 수준 READ COMMITTED의 갱신 규칙, 실행 확인은 구현 때). 그 결과 `previous_fact`는 앞
    요청이 넣은 문장이 되고 원래 옛 문장은 1단계 보관 한도로 사라진다 — 허용한다(드문 경우, 사용자 결정 f-6의
    "2단계 이상 이전 판본 유실 수용"과 같은 성질). 낙관적 잠금이나 advisory lock은 추가하지 않는다 — 사용자당
    트래픽이 매우 낮아 피해가 잠금 코드의 복잡도를 정당화하지 못한다(제안, ponytail 판단: 실제로 문제가 반복
    관찰되면 그때 추가한다).
  - **테스트 방법 (개정 2026-10-03, 안 2a 기준)**: 개발용 프로젝트 또는 트랜잭션 안(`begin; … rollback;`)에서
    테스트 사용자 A·B와 각자 기억 행을 만든 뒤 확인한다. 운영 DB에 테스트 행을 남기지 않는다.
    ① 대체: A의 행 id로 대체 쿼리를 실행해 **같은 id 1행이 반환되고**, 그 행의 `previous_fact`가 **옛
    `preference_text`와 같으며**(이것이 SET 우변 평가 규칙의 실행 확인이다), `preference_text`·`embedding`·
    `embedding_model`·`source_conversation_id`가 새 값이고 `id`·`user_id`·`created_at`이 변하지 않았는지
    확인한다. ② 소유자 방어: **B의 행 id를 A의 `user_id`로** 대체 쿼리에 넣어 0행이 반환되고 B의 행이
    바뀌지 않았는지 확인한다(핵심). ③ 존재하지 않는 uuid로 0행, uuid가 아닌 문자열은 오류가 나는지
    확인한다(애플리케이션 사전 검증이 이를 걸러야 한다는 근거). ④ 같은 행을 두 번 대체하면 `previous_fact`가 첫
    대체의 새 문장이 되고 원래 옛 문장은 남지 않는지(1단계 보관 한도) 확인한다. ⑤ 대체 직전에 행을 `delete`해 0행을
    만든 뒤 위 폴스루(2경로 → 3경로)가 새 문장을 저장하는지 애플리케이션 단위 테스트로 확인한다. ⑥ 경로 순서:
    id 지정이 있으면 거리와 무관하게 대체하고, id 지정이 없고 기억과의 거리가 `0.08` 미만이면 유사
    갱신, 둘 다 아니면 행 수가 1 늘어나는지 확인한다. ⑦ **유사 갱신·사용자 수정(PUT)은 `previous_fact` 불변**:
    `previous_fact`가 채워진 행에 갱신 쿼리와 PUT의 UPDATE를 각각 실행해 `previous_fact`가 그대로인지 확인한다.
    ⑧ **되돌리기(swap)**: 대체 후 아래 "되돌리기" SQL을 실행해 `preference_text`와 `previous_fact`가 서로 바뀌고
    다른 사용자의 id를 넣으면 0행인지 확인한다. 애플리케이션 단위 테스트(DeepSeek·Gemini 목)는 backend가
    [[anyang-backend-api]]의 테스트 방법에 적는다.
  - **행 수 상한 (미확정)**: 이 설계는 사용자당 기억 행 수에 상한을 두지 않는다. 갱신 위주 정책이라
    자연히 느리게 늘겠지만(모순 대체는 행을 늘리지 않는다), 상한이 필요한지는
    backend/frontend가 화면 설계에서 판단한다(이 문서 범위 밖).

- **이력 보관 구조 (확정, 확인 항목 48(f-1) 안 2a, 사용자 결정 2026-10-03)**: `user_preferences`에
  컬럼 1개를 더한다.

  | 컬럼 | 타입 | 설명 |
  |---|---|---|
  | previous_fact | text, null 허용 | 모순으로 대체되기 직전의 `preference_text` 1단계. null이면 대체된 적이 없다. 기본값 없음 |

  - 컬럼 이름 `previous_fact`는 사용자 예시를 그대로 쓴다. `check` 제약·FK·인덱스는 없다.
  - **채택하지 않은 안(비교 근거)**: 안 1(옛 행 `superseded_at`/`superseded_by` 표시 + 새 행 INSERT)은 행 id가
    바뀌고 `user_preferences`를 읽는 모든 쿼리에 활성 조건이 필요해 누락 위험이 컸다. 안 2b(별도 이력 테이블)는
    새 테이블이라 0019 RLS 규칙과 FK·cascade가 늘어난다. 안 2a는 쿼리·id가 그대로이고 컬럼 하나로 끝난다. 대가는
    이력이 1단계뿐이라는 것이며 사용자가 이를 수용했다(f-6).
  - **직전 임베딩은 보관하지 않는다**(사용자 결정은 "직전 문장만"). 그래서 행당 벡터는 1개 그대로이고 저장량이
    늘지 않는다.
  - 기존 행 기본값: `previous_fact`는 null(`default` 없음)이다. 컬럼 추가는 기본값 없는 nullable 컬럼이라 기존 행을
    다시 쓰지 않는다(0020, 아래).
  - 사용자 수정(PUT)이 `previous_fact`를 그대로 둘지 비울지는 사용자 결정 범위 밖이라 **기존 동작 유지 = 건드리지
    않음**으로 한다(현재 PUT의 UPDATE는 `previous_fact`를 SET 목록에 넣지 않는다 — 구현 때도 넣지 않는다).

- **영향 쿼리 (개정 2026-10-03, 안 2a, 코드 위치는 읽기 전용 확인)**: 행이 활성·비활성으로 나뉘지 않으므로
  **`user_preferences`를 읽는 기존 쿼리에 활성 조건을 추가할 필요가 없다.** 바뀌는 것은 새 대체 쿼리 하나다.
  이 문서는 코드를 고치지 않는다.

  | 쿼리 | 현재 위치 | 필요한 변경 |
  |---|---|---|
  | 기억 주입(최근 N·유사 K), 추출 프롬프트용 목록, 채팅·추천·알림 선호 벡터, 탈퇴 cascade | `web/app/api/chat/route.ts`, `web/app/api/notices/recommended/route.ts`, `web/app/api/jobs/notify/route.ts`, `users` 삭제 | 변경 없음. `previous_fact`는 읽지 않는다 |
  | 유사 갱신(0.08) | `web/app/api/chat/route.ts` `extractAndStorePreference` | 변경 없음. `previous_fact` 불변 |
  | 대체 | 현재 코드에 없음(신규) | 위 "대체 쿼리" |
  | 기억 화면 목록 GET | `web/app/api/preferences/route.ts` | 변경 없음. 응답 필드가 늘지 않는다(이전 문장 표시 없음, 결정 f-5). `select *`로 바뀌어 `previous_fact`가 응답에 섞이지 않는지 구현 때 확인한다 |
  | 기억 화면 수정 PUT | `web/app/api/preferences/[id]/route.ts` | 변경 없음. `previous_fact`를 건드리지 않는 제자리 UPDATE |
  | 기억 화면 삭제 DELETE | 같은 파일 | 변경 없음. `previous_fact`가 같은 행이라 함께 삭제된다(결정 f-4) |

  관리자 집계 쿼리(연령대·직군 등)는 `user_preferences`를 읽지 않는다. 모델 교체 재임베딩(위 `notice_chunks` 절)이
  `user_preferences`에도 적용되면 `previous_fact`는 문장 컬럼이라 임베딩 대상이 아니다(직전 임베딩이 없다). 되돌릴
  때 임베딩을 다시 계산한다.

- **되돌리기 (사용자 결정 f-5·f-6, 2026-10-03, SQL 수준만)**: 잘못 대체됐을 때 운영자가 사용자 요청으로 옛 문장을
  복구한다. **이전 문장을 보여 주는 UI와 되돌리기 API는 만들지 않는다**(f-5) — 되돌리기는 운영자가 DB에 직접
  접속해 실행하는 SQL이며(관리자 화면에서도 기억 원문은 보이지 않는 원칙이 있다), 사용자의 요청이 있을 때만 쓴다.
  되돌리기는 **현재 문장과 `previous_fact`를 맞바꾸는 것**이다. 2단계 이상 이전 판본은 이미 사라졌고 이를 수용한다(f-6).
  ```sql
  -- (1) 대체된 적이 있는 기억 확인 — $1 = user_id. 기억 원문이 나오므로 사용자 요청 처리 중에만 실행
  select id, preference_text, previous_fact, updated_at
  from user_preferences
  where user_id = $1 and previous_fact is not null
  order by updated_at desc;

  -- (2) 되돌리기(swap) — $1 = 기억 id, $2 = user_id, $3 = 되돌린 문장(= 현재 previous_fact)의 새 embedding,
  --     $4 = embedding_model. $3은 backend가 계산해 넘긴다(아래)
  update user_preferences
     set preference_text = previous_fact,
         previous_fact = preference_text,
         embedding = $3,
         embedding_model = $4
   where id = $1 and user_id = $2 and previous_fact is not null
  returning id;
  ```
  - **임베딩 재계산은 backend 몫이다.** 문장이 바뀌므로 `embedding`을 되돌린 문장 기준으로 다시 계산해야 검색이 실제
    문장과 어긋나지 않는다(위 "수정 시 재임베딩 필요"와 같은 이유). 직전 임베딩을 보관하지 않으므로 이 계산을 피할 수
    없다. 운영자가 임베딩을 계산해 `$3`을 넘기는 방법(스크립트 등)은 이 문서가 정하지 않는다 — backend 설계에서
    다룬다(결정 범위 밖, 미확정). 임베딩 없이 문장만 맞바꾸는 SQL은 쓰지 않는다.
  - (2)는 `updated_at`을 건드리지 않는다(되돌림은 기본은 내용 변경으로 보지 않는다 — 결정 범위 밖, 미확정). 복구
    직후 최근 기억 조회 순위는 기존 `updated_at` 기준이다. 즉시 상위로 오기를 원하면 `updated_at = now()`를 함께
    갱신하는 선택지가 있다.
  - swap은 한 번 더 실행하면 원래대로 돌아온다(대체된 적이 있는 행만 대상).

- **보존 기간·정리 잡 없음 (사용자 결정 f-3, 2026-10-03)**: `previous_fact`는 1단계만 남고 다음 대체 때 자동으로
  덮이므로(최신 직전 문장만 남는다) 별도 정리 잡을 두지 않는다. 대체된 적 없는 기억은 `previous_fact`가 null이다.
  처리방침·기억 화면 안내 문구("삭제하면 사라진다" 등)와 이력 보관의 정합성은 보류다(f-8, frontend 재개 때 확인).
  - **사용자 삭제와 이력 (사용자 결정 f-4)**: 사용자가 기억을 삭제하면 `previous_fact`도 같은 행이라 함께
    삭제된다. 연쇄 삭제 쿼리나 비활성 행 정리는 필요 없다. 탈퇴 cascade도 `user_id`의 `on delete cascade` 그대로다.

- **조회 쿼리 2종 (신규, 2026-09-29, 개정 2026-10-03: 안 2a라 활성 조건 없음 — 제안)**: 채팅 요청마다 시스템 프롬프트에 넣을 기억을 이 두 조회의
  합집합(중복 id 제거)으로 구성한다(제안). 각각 몇 개를 가져올지는 backend가 정한다(합쳐서 최대
  10개 제안, [[anyang-youth-policy-assistant#추천 설계]] 2번). 모순 대체는 같은 행을 덮어쓰므로 이 쿼리들은
  `previous_fact`를 읽지 않고 조건도 늘지 않는다.
  1. **최근 기억 N개**:
     ```sql
     select id, preference_text, updated_at
     from user_preferences
     where user_id = $1
     order by updated_at desc
     limit $2;
     ```
  2. **현재 메시지와 유사한 기억 K개** (임베딩은 이미 계산된 값을 재사용, 추가 임베딩 호출 없음):
     ```sql
     select id, preference_text, embedding <=> $2 as distance
     from user_preferences
     where user_id = $1
     order by embedding <=> $2
     limit $3;
     ```
  - **인덱스: 이번에도 추가하지 않는다 (제안, 개정 2026-10-03, 근거: 운영 DB 실측)**: 2026-09-29 기준
    `user_preferences`는 전체 3행, 사용자 1명이다(이번 세션에서 다시 측정하지 않았다). 이 설계(유사
    기억은 갱신, 신규는 새 사실일 때만 추가, 모순은 같은 행 덮어쓰기)에서는 사용자당 행 수가 대화량
    대비 훨씬 느리게 늘어난다. 위 두 쿼리 모두 `where user_id = $1`로 사용자별
    행을 먼저 좁히는데, 사용자당 행 수가 수십 단위를 넘지 않는 한 Postgres 플래너가 순차 스캔으로도
    충분히 빠르게 처리한다 — 현재 `user_preferences`에는 `user_id` 단독 인덱스도 없다
    (`0009_user_preferences.up.sql` 확인, HNSW만 있음). `previous_fact`는 조회 조건에 쓰이지 않으므로 인덱스를
    만들지 않는다(0020은 컬럼 추가만).
    - **HNSW 검색과 `user_id` 필터의 상호작용**: 기존 HNSW 인덱스는 모든 사용자·모든
      행을 담은 전역 인덱스다. HNSW는 근사 검색이라 `where` 조건은 인덱스로 후보를 먼저 뽑은 **뒤**
      걸러진다(post-filter, pgvector 동작에 대한 이 세션의 설명이며 설치된 pgvector 버전은 확인하지
      않았다). 그래서 플래너가 이 쿼리에 HNSW를 고르면 `user_id` 조건에서 후보가 걸러져 요청한 `limit`보다
      적게 돌려줄 수 있다. 현재 규모(수 행)에서는 플래너가 순차 스캔을 고르므로 영향이 없고, 위 "인덱스 필요
      없음"의 근거와 같은 전제다.
    - **재검토 조건**: 사용자당 행이 수백 단위로 늘거나 `EXPLAIN`에서 위 두 쿼리가 HNSW를 쓰면서 `limit`보다
      적은 행을 돌려주는 것이 관찰되면 그때 `create index concurrently … on user_preferences (user_id)`
      (되돌릴 수 있는 마이그레이션)를 추가하는 안과 pgvector의 반복 스캔 설정 사용(버전 확인 필요)을 비교한다.

#### consents — 가입 시 개인정보 필수 동의 기록

가입 시(Google·이메일 모두) 개인정보 필수 동의 화면을 두고 동의 시각을 기록하는 것은 확정
([[anyang-service-scope]], user, 2026-09-27). 동의 항목을 "수집·이용"(collection_use)과
"국외 이전"(overseas_transfer)으로 분리해 각각 받는 것, 처리방침 개정 시 재동의를 강제하는 것,
탈퇴 후에도 동의 기록을 즉시 삭제하지 않고 증빙용으로 일정 기간 보관하는 것도 확정
([[anyang-service-scope]], user, 2026-09-27). 아래 테이블 구조·컬럼 자체는 이 확정을 담기
위한 제안이었으나 확정됐다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete set null | 아래 "탈퇴 후 보관" 참고. cascade가 아니다 |
| consent_type | text, not null | `collection_use`(수집·이용) 또는 `overseas_transfer`(국외 이전). [[glossary]]의 consent-type. 값 셋은 이 두 개로 고정(제안) |
| policy_version | text, not null | 동의 시점의 개인정보 처리방침 버전 문자열(제안, 예: 날짜 기반 `2026-09-27`). 버전 부여 방식은 [[anyang-backend-api#1. 인증 (Auth.js v5)]] 참고 |
| consented_at | timestamptz, not null, default now() | 동의 시각 |
| withdrawn_at | timestamptz, null 허용 | 계정 탈퇴 시각. 사용자 삭제 처리 시 이 컬럼에 탈퇴 시각을 채우고 나서 `users` 행을 삭제한다(애플리케이션 책임, 아래 "탈퇴 후 보관" 참고) |
| ip_address | inet, null 허용 | 동의 시점 IP 기록 여부(제안) — 민감정보 최소화 원칙과 배치되므로 필요성 자체가 미확정 |

- 가입 흐름(회원가입 폼)에서 필수 체크박스 동의(수집·이용, 국외 이전 각각)를 받는 즉시 항목별로
  1행씩(총 2행) 남기는 방식(제안). `consent_type`으로 항목을 구분한다.
- 인덱스: `(user_id, consent_type, policy_version)` — 특정 사용자가 특정 항목의 현재
  `policy_version`에 동의했는지 조회할 때 쓴다. unique 제약을 걸지는 제안하지 않는다(재동의 시
  같은 `policy_version`에 중복 동의를 시도해도 해가 되지 않고, 이력을 여러 건 남기는 것 자체가
  의도이므로).
- **처리방침 개정 시 재동의 강제 (확정, 구조는 제안)**: 앱은 "현재 처리방침 버전" 상수를
  코드/환경변수로 관리한다(DB에 별도 버전 테이블을 두지 않는다 — 과설계 방지, 제안). 사용자가
  로그인할 때마다 `consent_type`별로 `consented_at`이 가장 최근인 행의 `policy_version`이
  현재 버전과 같은지 확인하고, 다르면(또는 기록이 없으면) 재동의 화면으로 보낸다(애플리케이션
  책임, backend 구현 단계에서 확정).
- `users` 테이블에 컬럼(예: `consented_at`)만 두는 대안도 있으나, 항목별·버전별 이력을 여러 건
  남기고 재동의를 추적하려면 별도 테이블이 낫다는 것이 제안 근거다. 최종 구조는 backend 조율
  후 설계 승인으로 확정한다.
- **탈퇴 후 보관 (확정: 즉시 삭제하지 않고 보관, 보관 기간·정리 방식은 제안)**: 사용자가 탈퇴하면
  `users` 행을 삭제하기 전에 그 사용자의 모든 `consents` 행에 `withdrawn_at = now()`를 먼저
  기록한다(애플리케이션 책임). `user_id`는 `on delete set null`이므로 `users` 행이 삭제돼도
  `consents` 행 자체는 남는다 — 동의 시각·항목·처리방침 버전은 그대로 증빙 자료로 유지되고,
  어느 사용자였는지 식별 가능한 연결만 끊긴다.
  - **보관 기간 — 확정: 1년 ([[anyang-service-scope]], user, 2026-09-27)**: 탈퇴(`withdrawn_at`)
    후 1년간 보관하고, 이후 정리 잡으로 삭제한다. 다른 로그성 테이블(90일)보다 긴 것은 `consents`가
    법적 증빙 목적이기 때문이다.
  - **보관 만료분 정리 잡 (제안 SQL, 되돌릴 수 없는 삭제)**: `collect_runs` 등과 같은 방식
    (pg_cron 트리거)으로 다음을 정기 실행한다.
    ```sql
    -- 제안: 매일 새벽 탈퇴 1년 경과 동의 기록 정리 (1년 보관은 확정, 실행 주기·시각은 제안)
    delete from consents where withdrawn_at is not null and withdrawn_at < now() - interval '1 year';
    ```
    이 삭제는 되돌릴 수 없으므로, 구현 단계에서 이 정리 잡을 실제로 pg_cron에 등록하려면
    지시서에 이 작업에 대한 별도 사용자 승인이 적혀 있어야 한다. 없으면 등록하지 않고 멈춰서
    보고한다(아래 "되돌릴 수 없는 마이그레이션 표시" 절에도 반영). 1년 보관 자체는 이미
    승인됐지만, dev-common.md 규칙상 되돌릴 수 없는 마이그레이션은 실행 단계에서도 그
    마이그레이션에 대한 사용자 승인이 지시서에 별도로 적혀 있어야 실행할 수 있다 —
    `collect_runs`/`api_usage_logs`의 `cleanup-logs` 잡과 같은 취급이다.

#### push_subscriptions

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete cascade | |
| endpoint | text, unique, not null | Web Push 구독 endpoint |
| p256dh / auth | text, not null | Web Push 키 |
| created_at | timestamptz, default now() | |

#### notify_settings (항목 범위·시간대·컬럼 타입 모두 확정)

알림 시각은 사용자별 자유 설정 + on/off로 확정됐다([[anyang-service-scope]], user,
2026-09-27). 고정 선택지 분기는 더 이상 고려하지 않는다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_id | uuid, PK, FK → users.id, on delete cascade | |
| notify_time | time, not null | 사용자가 자유롭게 고른 하루 중 시각([[glossary]]의 notify-time). 시간대는 아래 timezone 기준 |
| enabled | boolean, not null, default true | 알림 on/off |
| enabled_at | timestamptz, null 허용 | 알림을 켠(또는 마지막으로 다시 켠) 시각(제안). 알림 대상 공지 범위를 이 시각 이후 수집분으로 제한하는 데 쓴다(아래 참고). 가입·온보딩 시 이 행을 처음 만들 때도 `enabled`가 기본값 `true`이므로 이때 `now()`로 채운다(애플리케이션 책임). 이후 `enabled=false`로 끄는 시점에는 건드리지 않고, `false→true`로 다시 켤 때만 갱신한다 |
| timezone | text, not null, default 'Asia/Seoul' | 서비스가 국내 전용이므로 Asia/Seoul로 고정한다(확정). 모든 사용자에게 동일하게 적용하며, 사용자별로 다른 시간대를 선택하는 기능은 없다 |
| updated_at | timestamptz, default now() | 설정 변경 시각 |

- **알림 대상 공지 범위 (제안)**: "알림을 켠 시각 이후 수집된 공지만" 알림 대상으로
  삼는다 — 가입(또는 재가입) 직후 과거에 쌓인 공지가 한꺼번에 발송되는 것을 막기 위함이다.
  `/api/jobs/notify`의 매칭 쿼리(backend, [[anyang-backend-api#7. 스케줄러 — 수집 잡 / 알림
  잡]])에 `notices.collected_at > notify_settings.enabled_at` 조건을 추가하는 방식을 제안한다.
  이제 가입 시점부터 `enabled_at`이 항상 채워지므로, `enabled_at`이 null인 행은 이 컬럼을
  도입하기 전에 만들어진 레거시 행뿐이다. 이 경우 **발송 대상에서 제외한다(제안)** —
  "생성 시각 기준으로 간주" 대안도 있으나, 레거시 행의 실제 온/오프 이력을 알 수 없어 안전한
  쪽(제외)을 기본안으로 둔다. 최종 채택 여부와 정확한 비교 조건, 레거시 행 처리(마이그레이션
  시 `enabled_at`을 일괄 채울지)는 backend 조율 후 확정한다.
- `notify_time`은 `time` 범위(00:00~23:59)만 검증하면 된다(애플리케이션 책임, CHECK 제약 불필요).
- 시간대 처리: `notify_time`은 시간대 정보가 없는 `time` 타입이므로, "지금이 사용자의 알림
  시각인지" 비교할 때는 항상 `timezone`(Asia/Seoul 고정) 기준으로 현재 시각을 변환해 비교한다.
  DB 서버의 시스템 시간대나 `now()`의 UTC 값을 그대로 비교하지 않는다(애플리케이션/쿼리 책임,
  아래 pg_cron/pg_net 절 참고).

#### collect_runs — 관리자 화면 "공지 수집 관리"용, [[glossary]]의 collect-run

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| started_at | timestamptz, not null, default now() | |
| finished_at | timestamptz, null 허용 | 실행 중이면 null |
| trigger_type | text, not null | `scheduled`(pg_cron 자동) 또는 `manual`(관리자 수동 실행). 값 셋은 제안 |
| status | text, not null, default 'running' | `running` / `success` / `failed`. 값 셋은 제안 |
| collected_count | integer, not null, default 0 | 이번 실행에서 새로 저장한 공지 수 |
| error_summary | text, null 허용 | 실패 시 오류 요약(스택 트레이스 전체가 아니라 요약, 민감정보 없음) |
| triggered_by | uuid, FK → users.id, null 허용 | 수동 실행한 관리자. 자동 실행이면 null |

- 인덱스: `(started_at desc)` — 이력을 최신 순으로 조회.
- **"진행 중" 판정 가능 여부 (확인 항목 55, 2026-10-04 `0013_collect_runs`와 운영 DB 컬럼을 읽기 전용으로 확인)**:
  현재 스키마로 판정할 수 있다. 진행 중 = `status='running'`(기본값)이고 `finished_at is null`, 시작 시각은
  `started_at`(not null, default now())이다. 추가 컬럼 없이 `(started_at desc)` 인덱스로 최근 행만 훑으면 된다.
  `status` 값 셋은 코드에서 `running/success/failed`로 쓰며 DB check 제약은 없다.
  - **비정상 종료로 `running` 행이 남는 경우**: 함수가 제한 시간(300초)에 끊기거나 프로세스가 죽으면
    `finished_at`이 영영 null이라 "진행 중"이 풀리지 않는다. 스키마 변경 없이 "`started_at`이 N분보다 오래된
    `running` 행은 stale로 본다. **N=10분 (확정, 사용자 결정 2026-10-04, 확인 항목 55-l)**(함수 최대 실행 시간
    300초보다 길다). stale 행은 `failed`로 정리(update)한다: 수집 시작 때 `update collect_runs set status='failed',
    finished_at=now(), error_summary='stale' where status='running' and started_at < now() - interval '10 minutes'`
    를 먼저 실행하고, 남은 `running` 행이 있으면 진행 중으로 본다. 스키마 변경은 없다. 정확한 쿼리 작성은 backend 몫이다.
  - **원자성 한계**: "진행 중 행이 없으면 insert"는 두 호출이 동시에 오면 둘 다 통과할 수 있다. 부분 unique
    index(`status='running'`인 행은 하나만)로 막을 수 있으나 stale 행이 남으면 이후 수집이 모두 막히므로 제안하지
    않는다. 10분 주기에 quick은 대개 수 초라 겹칠 확률이 낮고, 겹쳐도 `source_url` 유니크(`on conflict`)로 공지가
    중복 저장되지는 않는다. 필요하면 backend가 `pg_try_advisory_lock`을 쓰는 방식을 설계에 제안한다 `(미확정)`.
  - **mode(quick/full) 기록 여부**: `collect_runs`에는 mode 컬럼이 없다(`trigger_type`은 `scheduled/manual`).
    겹침을 mode와 무관하게 하나만 허용하면 컬럼이 필요 없다. mode별로 구분하거나 관리자 화면에 mode를 보이려면
    `mode text` 컬럼 추가가 필요하며 이는 스키마 변경이다 `(미확정)`, backend 결정 뒤 0021에 합칠지 0022로 나눌지
    정한다. 이번 설계는 컬럼을 추가하지 않는다.
- collect-job(수집 잡) 실행 시작 시 1행을 만들고(`status='running'`), 끝나면 `finished_at`·
  `status`·`collected_count`·`error_summary`를 갱신한다(애플리케이션 책임).
- 관리자 화면의 "수동 수집 실행"은 이 테이블에 `trigger_type='manual'` 행을 만들며 잡을
  즉시 실행하는 API 엔드포인트로 구현한다(backend 설계에서 확정).

#### notify_logs — 관리자 화면 "알림 발송 현황"용 + 중복 발송 방지, [[glossary]]의 notify-log

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete cascade | |
| notice_id | uuid, FK → notices.id, on delete cascade | |
| reserved_at | timestamptz, not null, default now() | 발송 전 선점(행 INSERT) 시각. "언제부터 이 (사용자,공지) 조합을 처리 중이었는지" 추적용 |
| sent_at | timestamptz, null 허용 | 실제 발송(성공/실패 확정) 시각. `pending` 상태에서는 null |
| result | text, not null, default 'pending' | `pending`(선점됨, 발송 전) / `success` / `failed`. 값 셋은 제안 |
| error_summary | text, null 허용 | 실패 사유 요약(예: push 구독 만료) |
| failed_device_count | integer, not null, default 0 | 이번 발송에서 실패한 기기(구독) 수(신규). 아래 "다중 기기 발송 판정" 참고 |

- **다중 기기 발송 판정 (신규, 제안, [[anyang-youth-policy-assistant#확인이 필요한
  항목]] 30)**: 한 사용자가 `push_subscriptions`를 여러 개(기기 여러 대) 등록할 수 있다.
  notify-job은 한 (사용자, 공지) 조합에 대해 그 사용자의 모든 `push_subscriptions`에 전송을
  시도한다(제안, backend 소관). 하나라도 성공하면 `result='success'`로 기록하고(확정, user,
  2026-09-28 — 한 대라도 성공하면 success), 모두 실패하면 `result='failed'`로 기록한다. 이
  전송 시도 중 성공하지 못한 기기 수를 `failed_device_count`에 채운다(확정 — 실패 기기 수를
  함께 기록). 만료된 구독(410/404 — [[anyang-backend-api#8. Web Push (VAPID)]] 소관)을
  전송 전/후 어느 시점에 삭제할지, 삭제된 만료 구독을 이 실패 수에 포함할지는 backend가
  이미 정한 "만료 구독 삭제, 실패로 세지 않음" 방침([[anyang-backend-api]] 참고)을 따르는
  것이 이 컬럼의 취지와 맞다(제안 — 만료돼 삭제한 구독은 "이번에 실패한 기기"라기보다 더 이상
  유효하지 않은 기기이므로). 최종 집계 기준(어떤 실패까지 셀지)은 backend 조율 후 확정한다.
- **관리자 화면 표시 (제안)**: 13-2절 "날짜별 발송·실패 수" 집계에 `failed_device_count`
  합계를 추가할지는 이번 설계 범위 밖(필요하면 backend가 조회 쿼리에 `sum(failed_device_count)`
  를 더하면 된다, 스키마 변경 불필요).
- **중복 발송 방지 + pending 흐름 (제안, 프로젝트 문서 확인 항목 17과 연결)**: `unique(user_id,
  notice_id)` 제약을 둔다. notify-job은 다음 순서로 처리한다(제안, backend 구현 단계에서
  정확한 순서 확정).
  1. `INSERT INTO notify_logs (user_id, notice_id, result) VALUES ($1, $2, 'pending')
     ON CONFLICT (user_id, notice_id) DO NOTHING`으로 먼저 행을 선점한다.
  2. 실제로 삽입된 경우(영향 받은 행 수 1)에만 푸시를 전송한다. 이미 있던 조합이면(영향 받은
     행 수 0) 건너뛴다 — 같은 공지를 같은 사용자에게 두 번 보내는 경합 상황이 이 단계에서
     막힌다.
  3. 전송 결과에 따라 `UPDATE notify_logs SET result = 'success' | 'failed', sent_at = now(),
     error_summary = ... WHERE user_id = $1 AND notice_id = $2`로 갱신한다.
  - 주의: `result='failed'`인 행도 유니크 제약에 걸리므로, 발송 실패 후 재시도가 필요하면
    실패 행을 다시 갱신(UPDATE)하는 방식으로 처리한다(제안). `pending`으로 오래 남아있는 행
    (예: 전송 도중 프로세스가 죽은 경우)의 정리·재시도 정책은 이 설계 범위 밖이며 backend가
    정한다.
- 인덱스: `unique(user_id, notice_id)`(위), `(sent_at)` — 날짜별 발송·실패 수 집계용
  (`sent_at`이 null인 `pending` 행은 이 집계에서 자연히 제외된다).
- 관리자 화면 "날짜별 발송·실패 수" 집계 쿼리 예시(제안):
  ```sql
  select date_trunc('day', sent_at) as day, result, count(*)
  from notify_logs
  group by 1, 2
  order by 1 desc;
  ```
  "구독 수"는 `select count(*) from notify_settings where enabled = true` 또는
  `select count(*) from push_subscriptions`로 집계한다(어느 쪽을 "구독 수"로 볼지는 미확정 —
  backend 조율 필요).

#### api_usage_logs — 관리자 화면 "외부 API 사용량"용, [[glossary]]의 api-usage-log

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| provider | text, not null | `deepseek` / `gemini`. 값 셋은 제안 |
| operation | text, not null | 작업 종류(예: `chat`, `embedding`). 값 셋은 backend가 정함 |
| requested_at | timestamptz, not null, default now() | |
| status | text, not null | `success` / `rate_limited`(429) / `error`. 값 셋은 제안 |
| input_tokens / output_tokens | integer, null 허용 | 제공자 응답에 토큰 수가 없으면 null |

- **사용자 식별 없이 기록 (제안, 확정 필요)**: 이 테이블은 무료 한도 대비 사용량 집계가
  목적이므로 `user_id`를 두지 않는다 — 개인정보 최소화 원칙 및 "외부 AI에 식별정보 전송 금지"
  원칙([[anyang-ai-models-data-transfer]])과 같은 방향이다. 사용자별 사용량 분석이 나중에
  필요해지면 컬럼 추가(되돌릴 수 있는 마이그레이션)가 필요하며, 이는 새 요구사항이므로 별도
  설계 변경으로 다룬다.
- 인덱스: `(provider, date_trunc('day', requested_at))` 대신 아래처럼 쿼리 시점에
  `date_trunc`를 쓰거나, 집계가 잦으면 `requested_at` 단순 인덱스로 충분한지 backend가
  구현 단계에서 판단한다(제안, 과설계 방지).
- 무료 한도 대비 일 단위 집계 쿼리 예시(제안):
  ```sql
  select provider, date_trunc('day', requested_at) as day,
         count(*) filter (where status = 'success') as success_count,
         count(*) filter (where status = 'rate_limited') as rate_limited_count,
         count(*) filter (where status = 'error') as error_count,
         sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens
  from api_usage_logs
  where requested_at >= date_trunc('day', now())
  group by 1, 2;
  ```
  "무료 한도 대비 사용량"(예: 일 1000회 중 며칠 몇 회)은 이 집계 결과와 제공자별 한도 상수
  (코드 또는 환경변수, DB에 두지 않음)를 애플리케이션에서 비교해 계산한다(제안).
- 각 API 호출 지점(DeepSeek 채팅, Gemini 임베딩)에서 성공/실패와 무관하게 1행씩 남긴다
  (backend 구현 단계에서 호출 래퍼에 공통으로 넣는 방식 제안).

#### 연령대·직군 집계 쿼리 예시 (제안) — 관리자 화면 "사용자 관리·통계"용

개인 식별 없이 집계만 하므로 `profiles`를 그룹핑해서 조회한다.

```sql
-- 연령대 집계 (만 나이 계산은 애플리케이션이 birth_year 기준 5살 단위 등으로 구간화하거나,
-- 아래처럼 SQL에서 10년 단위로 묶는 방식도 가능. 구간 폭은 미확정 — backend/frontend 조율)
select (birth_year / 10) * 10 as birth_decade, count(*)
from profiles
where birth_year is not null
group by 1
order by 1;

-- 직군 집계
select occupation_type, count(*)
from profiles
where occupation_type is not null
group by 1;

-- 가입자 수(전체)
select count(*) from users where suspended_at is null;
```

- 위 쿼리는 `user_id`나 개별 행을 반환하지 않고 개수만 반환하므로 "관리자 화면에서도 개인별
  대화·기억 원문은 보이지 않는다" 원칙과 충돌하지 않는다.

### 로그성 테이블 보존 기간·정리 잡 (보존 기간 확정, 등록은 구현 단계 승인 대상)

- 대상: `collect_runs`, `api_usage_logs` — 90일 보존 후 정리 잡으로 삭제한다(확정,
  [[anyang-service-scope]], user, 2026-09-27). `notify_logs`는 중복 발송 방지의 유니크 제약
  근거 데이터이므로 이 정리 대상에서 **제외**한다(확정) — 오래된 행을 지우면 같은 (사용자, 공지)
  조합에 다시 알림을 보낼 수 있어 서비스 목적과 상충하기 때문이다. `notices`/`notice_chunks`/
  `consents`/`user_preferences`는 서비스 핵심 데이터(또는 별도 보관 정책, 위 `consents` 절
  참고)라 이 절의 정리 대상이 아니다. `user_preferences.previous_fact`도 정리 잡이 없다(사용자 결정 f-3,
  위 `user_preferences` 절 "보존 기간·정리 잡 없음").
- 정리 잡은 위 collect-job/notify-job과 같은 방식(pg_cron이 트리거, 삭제 로직은 앱 API 또는
  단순 SQL)으로 둔다(제안):
  ```sql
  -- 제안: 매일 새벽 오래된 로그 정리 (90일 보존은 확정, 실행 주기·시각은 제안)
  select cron.schedule(
    'cleanup-logs',
    '0 18 * * *', -- UTC 18:00 = Asia/Seoul 03:00
    $$
    delete from collect_runs where started_at < now() - interval '90 days';
    delete from api_usage_logs where requested_at < now() - interval '90 days';
    $$
  );
  ```
- **되돌릴 수 없는 마이그레이션 아님, but 되돌릴 수 없는 삭제**: 이 정리 잡은 스키마 변경이
  아니라 데이터 삭제를 주기적으로 실행하는 것이다. dev-common.md 규칙상 "데이터 삭제"는
  되돌릴 수 없는 작업에 해당한다. 90일 보존·정리 잡 등록 자체는 사용자 승인됨(user, 2026-09-27,
  [[anyang-service-scope]]) — 다만 dev-common.md 규칙상 되돌릴 수 없는 마이그레이션은 실행
  단계에서도 그 마이그레이션에 대한 사용자 승인이 지시서에 별도로 적혀 있어야 실행할 수 있다.
  구현 단계 지시서에 이 잡 등록에 대한 승인이 적혀 있지 않으면 등록하지 않고 멈춰서 보고한다
  (아래 "되돌릴 수 없는 마이그레이션 표시" 절에도 반영). `consents` 보관 만료분 정리 잡의
  보존 기간은 1년으로 확정됐다([[anyang-service-scope]], user, 2026-09-27, 위 `consents` 절
  참고) — 다만 90일 로그와 보존 기간이 다르고 삭제 대상 테이블도 달라 정리 잡 등록 자체는
  별도로 다룬다.

### pg_cron / pg_net 잡 정의

이전 가능성 원칙에 따라 스케줄 로직 본체는 앱 API 엔드포인트에 둔다. pg_cron은 트리거만 한다.

```sql
-- 제안: 5분마다 알림 잡 트리거 ([[anyang-backend-api#7. 스케줄러 — 수집 잡 / 알림 잡]]과
-- 5분 창 방식으로 통일함, 정확한 실행 주기는 backend와 조율)
select cron.schedule(
  'notify-job-trigger',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '앱 API URL(환경변수로 관리)',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-scheduler-secret', '공유 시크릿(환경변수/Supabase Vault로 관리, 문서에 값 기록 금지)'
    )
  );
  $$
);
```

- 공유 시크릿 헤더로 앱 API가 pg_net 호출만 수락하도록 검증한다(구체 헤더명·검증 로직은
  backend 설계에서 확정).
- **"지금 알림 받을 사용자" 선정 (제안, [[anyang-backend-api#7. 스케줄러 — 수집 잡 / 알림 잡]]의
  5분 창 방식과 통일)**: pg_cron 트리거는 `*/5 * * * *`(5분 정각 실행, Vercel Cron과 달리 창
  안 임의 시점이 아니라 정확히 그 시각에 실행됨)를 전제로 한다. `/api/jobs/notify`는 "직전
  실행 이후 지금까지" 5분 창 안에 `notify_time`이 들어오는 사용자를 고른다(pg_cron이 호출하는
  앱 API 엔드포인트 내부에서 조회, SQL은 예시이며 실제 구현은 backend가 정한다).

  ```sql
  -- 제안: Asia/Seoul 기준 현재 시각의 직전 5분 창 (notify_time, notify_time + 5분] 안에
  -- 드는 사용자를 고른다. time 타입은 24시 경계에서 모듈러 연산되므로(예: 23:58 + 5분 =
  -- 00:03), 창이 자정을 넘어가는 경우(윗값 < notify_time)를 OR로 따로 처리한다.
  select ns.user_id
  from notify_settings ns
  join users u on u.id = ns.user_id
  where ns.enabled = true
    and u.suspended_at is null
    and (
      -- 창이 자정을 넘지 않는 일반 경우
      (
        (ns.notify_time + interval '5 minutes')::time > ns.notify_time
        and (now() at time zone ns.timezone)::time
            > ns.notify_time
        and (now() at time zone ns.timezone)::time
            <= (ns.notify_time + interval '5 minutes')::time
      )
      or
      -- notify_time이 23:55~23:59:59라 창이 자정을 넘는 경우 (예: 23:57 → 00:02)
      (
        (ns.notify_time + interval '5 minutes')::time <= ns.notify_time
        and (
          (now() at time zone ns.timezone)::time > ns.notify_time
          or (now() at time zone ns.timezone)::time
             <= (ns.notify_time + interval '5 minutes')::time
        )
      )
    );
  ```

  - `u.suspended_at is null` 조건은 정지된 계정에 알림을 보내지 않기 위한 제안이다.
  - `timezone` 컬럼이 항상 `'Asia/Seoul'`로 고정이므로 이 쿼리는 사실상 Asia/Seoul 기준
    비교이지만, 컬럼을 참조해 두어 나중에 사용자별 시간대를 늘려야 할 때(현재는 계획 없음)
    스키마 변경 없이 확장 가능하다.
  - **잡 실행이 늦거나 겹쳐 같은 사용자가 두 번 이상의 5분 창에 걸쳐 뽑혀도** 실제 중복 발송은
    `notify_logs`의 `unique(user_id, notice_id)` 제약과 `INSERT ... ON CONFLICT DO NOTHING`
    선점(위 `notify_logs` 절)이 막는다 — 이 쿼리는 "후보 선정"만 책임지고, "실제로 한 번만
    보낸다"는 보장은 `notify_logs` 쪽 책임으로 분리한다(제안).
  - 자정 경계를 포함한 정확한 조건식과 pg_cron 실행이 지연될 때의 창 보정(예: 5분보다 오래
    걸린 실행 사이의 빈 구간)은 backend 구현 단계에서 최종 확정한다.
- collect-job(공지 수집) 트리거도 같은 방식(pg_cron + pg_net)이다. Vercel Cron은 이전 가능성 원칙 3과
  Hobby 하루 1회 제한 때문에 쓰지 않는다. **확인 항목 55(사용자 결정 2026-10-04)로 "하루 1회" 서술을 대체**한다.
  새 글을 분 단위로 반영해야 하므로 잡을 둘로 나눈다(두 cron 식은 확정, 10분 주기 조정 가능성은 55-f `(미확정)`).

  | 잡 이름 | cron (UTC) | 호출 | 역할 |
  |---|---|---|---|
  | `collect-quick` | `*/10 * * * *` | `/api/jobs/collect?mode=quick` | 목록 1페이지만 확인, 새 글만 상세 수집 |
  | `collect-full` | `0 19 * * *` (서울 04:00) | `/api/jobs/collect?mode=full` | 최근 1~2페이지 정밀 점검, 본문 수정 감지 |

  모드별 동작 상세는 backend 설계 몫이다([[anyang-backend-api]]). 이 문서는 트리거만 정한다.
  ```sql
  -- 제안: 수집 잡 2개. 기존 템플릿 web/db/jobs/collect-job-trigger.sql(잡 이름 collect-job-trigger, 하루 1회)을
  -- 이 두 잡으로 나눈다. <APP_API_URL>, <SCHEDULER_SECRET>은 실제 값으로 바꿔 실행(문서에 값 기록 금지)
  select cron.schedule(
    'collect-quick',
    '*/10 * * * *',
    $$
    select net.http_post(
      url := '<APP_API_URL>/api/jobs/collect?mode=quick',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-scheduler-secret', '<SCHEDULER_SECRET>'
      )
    );
    $$
  );

  select cron.schedule(
    'collect-full',
    '0 19 * * *',
    $$
    select net.http_post(
      url := '<APP_API_URL>/api/jobs/collect?mode=full',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-scheduler-secret', '<SCHEDULER_SECRET>'
      )
    );
    $$
  );
  ```
  - **템플릿 교체 계획**: 구현 단계에서 `web/db/jobs/collect-job-trigger.sql`을 위 두 잡으로 고친다. 기존 이름
    `collect-job-trigger`는 아직 등록된 적이 없으므로(pg_cron 미설치, 2026-10-04 확인) 해제 SQL은 필요 없다. 이미
    등록돼 있다면 `select cron.unschedule('collect-job-trigger');`를 먼저 실행한다.
  - **운영 작업이며 사용자 승인 필요**: 현재 운영 DB에 `pg_cron`·`pg_net`은 설치돼 있지 않다(2026-10-04
    `list_extensions`: 둘 다 `installed_version` null). 확장 설치(`create extension`), 실제 URL·시크릿 입력, 잡 등록은
    운영 DB를 바꾸는 작업이라 구현 단계 지시서에 사용자 승인이 별도로 적혀 있어야 실행한다. 없으면 실행하지 않고
    멈춰서 보고한다. 시크릿은 `SCHEDULER_SHARED_SECRET`을 Vercel과 Supabase Vault에 같은 값으로 넣는다
    (프로젝트 문서 확인 항목 40). 값은 문서에 남기지 않는다.
  - 호출 보호: 프로덕션 주소는 GET 405로 보호 미적용을 간접 확인했다(확인 항목 39 갱신). 확장 설치 뒤 실제 POST 1회로
    최종 확인하고, 막히면 `x-vercel-protection-bypass` 헤더를 추가한다.
  - **겹침 방지**: 10분마다 호출되므로 이전 실행이 끝나기 전에 다음 호출이 올 수 있다. `collect_runs`의 진행 중 기록으로
    건너뛰는 판정은 backend 몫이다(판정 가능 여부와 stale 행 처리는 위 `collect_runs` 절).
  - **`net.http_post`는 비동기**다. 응답 상태는 `net._http_response`에서, 실행 이력은 `cron.job_run_details`에서
    본다(테스트 방법 참고). pg_net 응답 테이블 보존 기간은 기본값을 쓴다(제안).
- UNO Q 전환 시 트리거만 `리눅스 cron + curl`로 교체하고 잡 로직(앱 API)은 그대로 둔다
  ([[anyang-deployment-portability#이전 가능성 원칙 (Vercel+Supabase ↔ UNO Q)]]).

### 마이그레이션 도구

- Supabase 대시보드 전용 마이그레이션(Supabase CLI의 Supabase 전용 기능)은 이전 가능성 원칙과
  충돌할 수 있어 쓰지 않는다(제안). 대신 표준 PostgreSQL에서도 동작하는 SQL 마이그레이션 도구
  (예: `node-pg-migrate`, `drizzle-kit`, 순수 `.sql` 파일 + `psql`)를 backend와 조율해 고른다.
  선택 기준: `DATABASE_URL` 하나로 개발/운영/UNO Q 어디서든 실행 가능해야 한다.
- 개발/운영 Supabase 프로젝트는 별도로 둔다([[anyang-deployment-portability]] 확정). 각 환경은
  독립된 `DATABASE_URL`을 쓰고, 같은 마이그레이션 파일을 순서대로 적용한다.

### 공개 API 차단 (확인 항목 35, 확장성 원칙)

19개 테이블 생성 마이그레이션을 적용한 뒤 Supabase 보안 경고로 public 테이블 전체가 RLS
꺼짐 상태이고, anon(공개) 키로 모든 행을 읽고 쓸 수 있다는 사실이 드러났다(user, 2026-09-28).
앱은 서버에서만 `pg` Pool(`web/lib/db.ts`)로 `DATABASE_URL`에 접속하고 supabase-js나 공개
키를 쓰지 않으므로, 공개 키 경로가 열려 있을 이유가 없다 — 막는다.

**확장성 요구**: 이 조치는 새 테이블 추가·기존 테이블 수정 뒤에도 유지돼야 한다(user,
2026-09-28). RLS를 테이블마다 매번 켜는 방식만으로는 새 테이블을 만들 때 깜빡하면 다시
뚫린다. 그래서 두 겹을 둔다 — 현재 테이블 RLS + 미래 테이블 기본 권한 회수(`alter default
privileges`). 기본 권한 회수가 확장성의 핵심이다: 이후 어떤 경로로 테이블을 만들어도 anon·
authenticated 롤에 애초에 권한이 없다.

- **새 테이블을 만드는 마이그레이션 관례(확정, 이 문서 규칙)**: 새 테이블을 만드는 마이그레이션은
  같은 파일에서 `enable row level security`를 함께 적용한다. `alter default privileges`가
  권한을 막아도 RLS 자체는 켜두는 것이 이중 방어다.
- **클라이언트 직접 접근이 필요해지면**: 이 원칙을 뒤집는 것이므로 설계 변경으로 처리한다.
  전체 잠금을 풀지 않고, 필요한 테이블에만 권한(GRANT)과 RLS 정책을 준다.
- **대시보드 Data API 노출 끄기**: 새 테이블도 자동으로 막아주지만 저장소(마이그레이션 파일)에
  남지 않아 프로젝트마다 손으로 다시 해야 한다. 주 수단에서 빼고, 배포 체크리스트의 선택
  사항(이중 방어)으로만 남긴다 — 지금은 하지 않는다.

#### 마이그레이션 0019_lock_public_api (계획)

- **up**:
  - DO 블록으로 `pg_tables`(schemaname='public')를 순회하며 모든 테이블(`schema_migrations`
    포함)에 `enable row level security`를 적용한다. 정책은 만들지 않는다 — 정책 없는 RLS는
    기본적으로 모든 행을 막고, 서버는 `DATABASE_URL` 소유자 권한으로 접속하므로 RLS 자체와
    무관하게(테이블 소유자는 RLS를 우회) 영향받지 않는다.
  - DO 블록으로 `pg_roles`에 `anon`, `authenticated` 롤이 있는지 먼저 확인한다. 있을 때만
    아래를 실행한다 — UNO Q 등 anon 롤이 없는 표준 PostgreSQL 환경에서도 에러 없이 지나가게
    하기 위해서다(이전 가능성 원칙).
    - 현재 테이블·시퀀스·함수 권한 회수: `revoke all on all tables/sequences/functions in
      schema public from anon, authenticated;`
    - 미래 객체 권한 선회수: `alter default privileges for role postgres in schema public
      revoke all on tables/sequences/functions from anon, authenticated;` — 이후 어떤
      마이그레이션 경로(`migrate.sh` 또는 MCP)로 테이블을 만들어도 anon·authenticated에
      기본 권한이 없다.
- **down**: 위를 반대로 적용한다 — `alter default privileges ... grant all ...`, 현재 테이블
  권한 `grant all`, 각 테이블 `disable row level security`. anon·authenticated 롤이 있을
  때만 권한 관련 문을 실행한다(up과 동일 조건).
- **롤백 가능 여부**: 스키마 변경(RLS on/off, 권한 회수/부여)만 다루고 데이터를 삭제하지
  않는다. 되돌릴 수 없는 마이그레이션(테이블·컬럼 삭제, 데이터 삭제, 타입 축소)에 해당하지
  않는다 — 아래 "되돌릴 수 없는 마이그레이션 표시" 절에도 반영.
- **운영 적용 시 원자성(확정, 프로젝트 문서 확인 항목 35)**: up 파일 전체를 `begin; …
  commit;` 단일 트랜잭션으로 적용한다. 중간 실패 시 전체가 롤백되게 하기 위해서다.

#### 적용 후 점검 (누락 감지, `migrate.sh`와 MCP 두 적용 경로 공통)

새 테이블이 생겨도 위 규칙이 지켜지지 않으면(관례를 깜빡하거나 기본 권한 회수가 프로젝트
전환 중 빠지는 경우) 점검 SQL이 잡는다.

- 점검 1 — RLS가 꺼진 public 테이블 목록(0행이어야 함, 제안 SQL):
  ```sql
  select relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  ```
- 점검 2 — anon 롤에 테이블 권한이 남은 목록(0행이어야 함, 제안 SQL, anon 롤이 없으면 이
  점검 자체를 건너뛴다):
  ```sql
  select table_name from information_schema.tables t
  where table_schema = 'public'
    and has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'SELECT');
  ```
- `web/db/migrate.sh up`의 마지막 단계로 위 점검 2개를 실행한다(제안, 구현 단계에서 정확한
  출력 형식은 ``). 결과가 있으면 테이블 이름을 출력하고 `exit 1`로 끝낸다 — up이
  "성공"으로 끝났는데 공개 접근이 남는 상황을 막는다.
- MCP(`apply_migration`)로 적용한 뒤에도 같은 점검 SQL 2개와 `get_advisors`(security 타입,
  RLS 관련 경고 0건 확인)를 실행한다.

#### 배포 체크리스트 메모 (선택, 지금 하지 않음)

- Supabase 대시보드에서 Data API 노출을 끄는 것은 이중 방어이지만 저장소에 남지 않으므로
  주 수단이 아니다. 새 프로젝트를 만들 때(개발용 프로젝트 등, 프로젝트 문서 확인 항목 36)
  체크리스트 항목으로만 남긴다(제안, 이 문서는 구현하지 않는다).

### 마이그레이션 계획 (0017·0018, 확인 항목 29·30)

기존 마이그레이션은 `web/db/migrations/0000_extensions` ~ `0016_collect_runs_triggered_by_set_null`
(파일당 `.up.sql`/`.down.sql` 쌍, 순수 SQL)까지 있다(구현 완료분, 실제 파일 확인).
새 결정 29·30을 위한 마이그레이션 2건을 다음 번호로 계획한다(제안, 파일은 구현 단계에서
생성 — 이번 설계 단계에서는 만들지 않는다).

- **0017_auth_attempts** — `auth_attempts` 테이블 생성(위 절 참고).
  - up: `create table auth_attempts (id uuid primary key default gen_random_uuid(), attempt_type text not null, identifier_type text not null, identifier_hash text not null, created_at timestamptz not null default now()); create index auth_attempts_lookup_idx on auth_attempts (attempt_type, identifier_type, identifier_hash, created_at);`
  - down: `drop table auth_attempts;`
  - 롤백: 신규 테이블 생성이므로 `DROP TABLE`로 완전히 되돌릴 수 있다. 되돌릴 수 없는
    마이그레이션이 아니다(테이블 삭제는 "새로 만든 것을 되돌리는" 것이지 기존 데이터 삭제가
    아니다).
- **0018_notify_logs_failed_device_count** — `notify_logs`에 `failed_device_count` 컬럼 추가.
  - up: `alter table notify_logs add column failed_device_count integer not null default 0;`
  - down: `alter table notify_logs drop column failed_device_count;`
  - 롤백: 컬럼 추가이므로 `DROP COLUMN`으로 되돌릴 수 있다. 기존 행은 `default 0`으로
    채워지므로 마이그레이션 자체가 기존 데이터를 깨지 않는다. 되돌릴 수 없는 마이그레이션이
    아니다.
- 두 마이그레이션 모두 테이블/컬럼 신설이라 "되돌릴 수 없는 마이그레이션"(테이블·컬럼 삭제,
  데이터 삭제, 타입 축소)에 해당하지 않는다 — 구현 단계에서 특별한 사용자 승인 없이도
  실행할 수 있다(dev-common.md 규칙 4단계, "구현 단계 지시서에 승인 내용 확인" 절차는 여전히
  따른다). 단, 이 두 마이그레이션이 여는 정리 잡(`cleanup-auth-attempts`, 위 `auth_attempts`
  절)은 데이터 삭제이므로 별도로 되돌릴 수 없는 작업이며 그 잡 등록 자체에 대한 사용자 승인이
  구현 단계 지시서에 적혀 있어야 한다(아래 "되돌릴 수 없는 마이그레이션 표시" 절에도 반영).

### 마이그레이션 계획 (0019, 확인 항목 35)

위 "공개 API 차단" 절의 `0019_lock_public_api`를 다음 번호로 계획한다(제안, 파일은 구현
단계에서 생성 — 이번 설계 단계에서는 만들지 않는다). up/down SQL 개요는 위 절을 참고한다
(중복 기재 방지). 스키마·데이터 삭제가 없어 되돌릴 수 없는 마이그레이션이 아니다 — 구현
단계에서 별도 승인 없이 실행할 수 있다(단, 운영 적용이므로 위 "운영 적용 시 원자성" 절의
트랜잭션·사전 점검 절차는 반드시 따른다).

### 마이그레이션 계획 (0020, 확인 항목 48(f))

모순으로 대체되기 직전의 문장을 같은 행에 보관하기 위한 컬럼 추가다(사용자 결정 안 2a, 2026-10-03). 현재 마지막
마이그레이션은 `0019_lock_public_api`(`web/db/migrations/` 파일 목록 확인)이므로 다음 번호로 계획한다(파일은 구현
단계에서 생성 — 이번 설계 단계에서는 만들지 않았고 원격 DB에도 적용하지 않았다). 컬럼의 의미와 구조 선택 근거는 위
`user_preferences` 절의 "이력 보관 구조"에 있다(중복 기재 방지). 새 테이블은 없다.

- **0020_user_preferences_previous_fact** (이름은 제안)
  - up:
    ```sql
    begin;
    alter table user_preferences
      add column previous_fact text;
    commit;
    ```
  - down (사용자 결정 f-7: 안전장치 없는 단순 컬럼 drop):
    ```sql
    begin;
    alter table user_preferences
      drop column previous_fact;
    commit;
    ```
  - **기존 행**: `default` 없는 nullable이라 기존 모든 행의 `previous_fact`는 null(대체된 적 없음)이다. 컬럼 추가는
    기존 행을 다시 쓰지 않는다.
  - **되돌릴 수 있는가**: up은 컬럼 추가라 되돌릴 수 있는 마이그레이션이다(0018과 같은 성격). down은 컬럼 drop이라
    **보관된 직전 문장이 사라진다.** 사용자가 안전장치 없음으로 정했으므로(f-7) down에 가드를 두지 않는다. 다만
    `previous_fact`가 채워진 행이 있을 때 down을 실행하면 데이터 삭제이므로 되돌릴 수 없는 마이그레이션 표시 절을
    따른다(아래).
  - **0019 "공개 API 차단" 규칙**: 새 테이블을 만들지 않으므로 "같은 파일에서 RLS 켜기" 관례는 해당 없다.
    `user_preferences`는 0019에서 이미 RLS가 켜지고 anon·authenticated 권한이 회수됐고, 컬럼 추가는 둘 다
    바꾸지 않는다. 그래도 운영 적용 뒤 위 "적용 후 점검" 절의 점검 SQL 2개(0행이어야 함)를 다시 돌린다.
  - **적용 순서**: DB(0020)를 먼저, backend 코드를 나중에 배포한다. 코드가 먼저 나가면 없는 컬럼
    `previous_fact`를 참조하는 대체 쿼리가 오류가 난다. 반대로 0020만 먼저 적용되면 현재 코드는 컬럼을
    모른 채 정상 동작한다(기존 쿼리가 `previous_fact`를 쓰지 않는다).
  - 인덱스는 이 마이그레이션에 포함하지 않는다(위 "조회 쿼리 2종"의 인덱스 항목).

### 마이그레이션 계획 (0021, 확인 항목 55)

`notices`에 고정 공지·본문 이미지·첨부 컬럼 3개를 더하고 `content_hash`의 unique 제약을 푼다(사용자 결정 2026-10-04). `web/db/migrations/`의 마지막
파일은 `0020_user_preferences_previous_fact`이고 0021은 비어 있음을 확인했다(번호 겹침 없음). 파일은 구현 단계에서
만든다 — 이번 설계 단계에서는 만들지 않았고 운영 DB에도 적용하지 않았다. 컬럼 의미는 위 `notices` 절에 있다.

- **0021_notice_attachments_pinned** (`web/db/migrations/0021_notice_attachments_pinned.{up,down}.sql`)
  - up:
    ```sql
    begin;
    alter table notices
      add column is_pinned boolean not null default false,
      add column image_count int not null default 0,
      add column attachments jsonb not null default '[]'::jsonb;
    -- 확인 항목 55-j: 중복 판정은 source_url만 쓴다. 제약 이름은 운영 DB에서 확인한 notices_content_hash_key
    alter table notices drop constraint notices_content_hash_key;
    commit;
    ```
  - down:
    ```sql
    begin;
    -- content_hash가 같은 행이 둘 이상 있으면 아래 add constraint가 실패한다(트랜잭션 전체 롤백)
    alter table notices add constraint notices_content_hash_key unique (content_hash);
    alter table notices
      drop column attachments,
      drop column image_count,
      drop column is_pinned;
    commit;
    ```
  - **content_hash unique 해제**: `drop constraint`는 제약과 함께 딸린 unique 인덱스도 지운다. 데이터는 지워지지
    않는다. 이름 `notices_content_hash_key`는 `0005_notices.up.sql`의 인라인 `unique`에서 PostgreSQL이 붙인 기본
    이름이며 운영 DB의 `pg_constraint`에서 확인했다(`UNIQUE (content_hash)`). 구현 단계에서 적용 직전에 한 번 더
    확인한다. `if exists`는 쓰지 않는다 — 이름이 다르면 조용히 넘어가지 않고 실패해 알리도록 한다.
  - **down 주의 (사용자 승인 필요)**: 462건 수집 뒤에는 같은 `content_hash`를 가진 서로 다른 글이 있어 down의
    `add constraint unique`가 **실패한다.** down을 실행하려면 먼저 중복 해시 행을 지우거나 해시를 바꿔야 하는데 이는
    데이터 삭제·변경이므로 구현 단계 지시서에 별도 사용자 승인이 있어야 한다. 중복 행이 없을 때(수집 전)만 승인 없이
    down을 실행할 수 있다. 확인 쿼리: `select content_hash, count(*) from notices group by content_hash having
    count(*) > 1;` (0행이어야 승인 없이 가능).
  - **롤백/되돌릴 수 있는가**: up은 컬럼 추가와 제약 해제라 데이터를 지우지 않으므로 되돌릴 수 없는 마이그레이션이
    아니다(단 위 down 주의). 컬럼 추가의 상수 기본값이 있는 `not null` 추가는
    PostgreSQL 11 이상에서 테이블을 다시 쓰지 않는다. down은 컬럼 drop이라 **수집된 첨부·고정·이미지 수 값이
    사라진다.** 다만 이 값은 원문 사이트에서 다시 수집할 수 있는 파생 값이고, 현재 notices는 0건이다. 적용 직후
    백필 전이라면 손실이 없다. 백필 후 down을 실행하면 데이터 삭제이므로 구현 단계 지시서에 별도 사용자 승인이
    있어야 한다(아래 "되돌릴 수 없는 마이그레이션 표시").
  - **0019 "공개 API 차단" 규칙**: 새 테이블이 없어 "같은 파일에서 RLS 켜기" 관례는 해당 없다. `notices`는 0019에서
    이미 RLS가 켜지고 anon·authenticated의 테이블 권한이 회수됐다. 이 권한 회수는 테이블 수준이라 새 컬럼에도 그대로
    적용된다(컬럼 단위 grant를 따로 두지 않았다). 그래도 운영 적용 뒤 위 "적용 후 점검" 절의 점검 SQL 2개(0행이어야
    함)를 다시 돌린다.
  - **적용 순서**: DB(0021)를 먼저, backend 코드를 나중에 배포한다. 코드가 먼저 나가면 없는 컬럼을 쓰는 upsert가
    오류가 난다. 반대로 0021만 먼저 적용되면 현재 코드는 새 컬럼을 모른 채 기본값으로 정상 동작한다.
  - 인덱스는 추가하지 않는다(위 `notices` 절). `content_hash`는 일반 인덱스도 두지 않는다.
  - **backend가 알아야 할 점**: (1) 중복 판정·upsert 충돌 대상은 `source_url`만이다 — `on conflict (source_url)`을
    쓰고 `on conflict (content_hash)`는 제약이 없어져 오류가 난다. (2) `on conflict do nothing`이 해시 충돌 때문에
    새 글을 조용히 버리던 동작이 사라진다. (3) 0021을 먼저 적용해야 462건이 들어온다. 코드(`source_url` 기준 충돌
    처리)를 먼저 배포해도 제약이 남아 있으면 해시가 같은 글이 계속 거부된다.

### 되돌릴 수 없는 마이그레이션 표시

- 이 설계 단계에서는 신규 테이블/컬럼 생성만 다룬다. 되돌릴 수 없는 마이그레이션(테이블·컬럼
  삭제, 데이터 삭제, 타입 축소)은 없다. 단 0020(직전 문장 컬럼 추가, 확인 항목 48(f))의 down은 아래 항목을 따른다.
- 구현 단계에서 재임베딩 절차 중 "기존 임베딩 컬럼 삭제"(모델 교체 시)는 되돌릴 수 없는
  마이그레이션이다. 실행 전 별도 사용자 승인이 필요하다(dev-common.md 규칙 4단계).
- 위 "로그성 테이블 보존 기간·정리 잡"의 `cleanup-logs` pg_cron 등록(`collect_runs`/
  `api_usage_logs` 90일 삭제)은 되돌릴 수 없는 작업이지만 90일 보존 자체는 사용자 승인됨(user,
  2026-09-27). 구현 단계 지시서에 이 잡 등록에 대한 승인이 별도로 적혀 있어야 실제로 등록한다.
  없으면 등록하지 않고 멈춰서 보고한다.
- `consents` 보관 만료분 정리 잡(위 `consents` 절)도 되돌릴 수 없는 삭제다. 1년 보관은 확정됐으나
  (user, 2026-09-27, [[anyang-service-scope]]), `cleanup-logs`와 마찬가지로 구현 단계 지시서에
  이 정리 잡 등록에 대한 별도 사용자 승인이 적혀 있어야 실제로 등록한다. 없으면 등록하지 않고
  멈춰서 보고한다.
- `auth_attempts` 정리 잡(`cleanup-auth-attempts`, 위 `auth_attempts` 절)도 되돌릴 수 없는
  삭제다. 1일 보존 값은 확정됐으나, 구현 단계에서도 이 정리 잡의 pg_cron 실제 등록에 대한
  별도 사용자 승인이 지시서에 적혀 있어야 등록한다(위 `auth_attempts` 절과 동일한 규칙).
  없으면 등록하지 않고 멈춰서 보고한다. `auth_attempts` 테이블 자체(0017
  마이그레이션)와 `notify_logs.failed_device_count` 컬럼(0018 마이그레이션)은 위
  "마이그레이션 계획" 절에 적힌 대로 되돌릴 수 없는 마이그레이션이 아니다.
- `0019_lock_public_api`(위 "공개 API 차단" 절)도 되돌릴 수 없는 마이그레이션이 아니다 —
  RLS on/off와 권한 회수/부여만 다루고 데이터를 지우지 않는다. 다만 운영 DB에 적용하므로
  "운영 적용 시 원자성"과 "적용 후 점검" 절의 절차(트랜잭션, 소유자·접속 롤 점검, 점검 SQL,
  `get_advisors`)는 승인 여부와 무관하게 반드시 따른다 — 이는 되돌릴 수 없음 여부가 아니라
  운영 장애 방지 목적이다.
- `0020_user_preferences_previous_fact`(위 "마이그레이션 계획 (0020)")의 up은 컬럼 추가라 되돌릴 수 없는
  마이그레이션이 아니다. down은 단순 컬럼 drop이며(사용자 결정 f-7, 안전장치 없음) 가드를 두지 않는다. 다만
  **`previous_fact`가 채워진 행이 하나라도 있을 때 down을 실행하면 보관된 직전 문장이 사라지는 데이터 삭제**이므로
  그 경우에는 구현 단계 지시서에 별도 사용자 승인이 있어야 한다. 없으면 down을 실행하지 않고 멈춰서 보고한다
  (모두 null이면 손실이 없어 해당 없다). up 적용은 별도 승인이 필요 없다.
- `0021_notice_attachments_pinned`(위 "마이그레이션 계획 (0021)")의 up은 컬럼 추가라 되돌릴 수 없는 마이그레이션이
  아니다. down은 컬럼 drop이라 백필 후에는 수집된 값이 사라진다. 백필 전(현재 notices 0건) 또는 `is_pinned`가 모두
  false·`image_count`가 모두 0·`attachments`가 모두 `[]`이면 손실이 없어 해당 없다. 또 down의 `content_hash` unique
  복원은 같은 해시의 행이 둘 이상이면 실패한다(실행하려면 중복 행 삭제·변경이 필요한 데이터 변경). 그 외에 down을
  실행하려면 구현 단계 지시서에 별도 사용자 승인이 있어야 하고, 없으면 실행하지 않고 멈춰서 보고한다. up 적용은 별도
  승인이 필요 없다.
- 수집 잡 두 개(`collect-quick`, `collect-full`)의 pg_cron·pg_net 확장 설치, 실제 URL·시크릿 입력, 잡 등록은
  운영 DB를 바꾸는 작업이다. 데이터 삭제는 아니지만 외부 호출을 시작하므로 구현 단계 지시서에 사용자 승인이
  별도로 적혀 있어야 실행한다(위 "pg_cron / pg_net 잡 정의").
- 대체된 행 정리 잡은 두지 않으므로(사용자 결정 f-3) pg_cron 등록이나 정리용 삭제는 없다. 사용자가 기억을 삭제할 때
  `previous_fact`가 함께 사라지는 것은 앱 코드가 실행하는 일상 삭제(기억 삭제 API)이지 마이그레이션이 아니다.

## 테스트 방법 (제안)

- 마이그레이션 적용: 개발용 Supabase 프로젝트의 `DATABASE_URL`로 마이그레이션 도구를 실행하고
  `psql`에서 `\d 테이블명`으로 컬럼·제약·인덱스가 설계대로 생성됐는지 확인한다.
- 롤백 확인: 각 마이그레이션 파일마다 대응하는 down 마이그레이션(테이블 생성의 역은 `DROP TABLE`)을
  만들고, 적용 → 롤백 → 재적용이 에러 없이 반복되는지 확인한다. 컬럼 추가류는 `DROP COLUMN`으로
  간단히 되돌아가지만, 위 "되돌릴 수 없는 마이그레이션"에 해당하면 롤백 대신 사용자 승인 절차를
  따른다.
- 제약 확인 쿼리 예시:
  - unique 확인: `SELECT source_url, count(*) FROM notices GROUP BY source_url HAVING count(*) > 1;` (0행이어야 함.
    `content_hash`는 0021 이후 중복이 허용된다)
  - FK cascade 확인: 테스트 사용자 삭제 후 해당 user_id를 가진 profiles/accounts/credentials/
    conversations/push_subscriptions/notify_settings/user_preferences 행이 함께 삭제됐는지
    확인한다. `consents`는 반대로 확인한다 — `withdrawn_at`을 먼저 채운 뒤 `users` 행을
    삭제하고, `consents` 행이 삭제되지 않고 `user_id`만 null로 바뀌었는지 확인한다(위
    `consents` 절, `on delete set null`).
- 인덱스 확인: `EXPLAIN ANALYZE`로 벡터 유사도 검색 쿼리가 HNSW 인덱스를 쓰는지(`Index Scan using ... hnsw`)
  확인한다. 데이터가 적을 때는 planner가 seq scan을 고를 수 있어 테스트 데이터가 어느 정도
  있어야 유효하다.
- pg_cron/pg_net: 개발 프로젝트에서 잡을 등록하고 `cron.job_run_details` 테이블로 실행 이력과
  `net.http_post` 응답 상태코드를 확인한다.
- 공지 숨김 확인: 테스트 공지를 `hidden_at`으로 숨긴 뒤, 추천·벡터 검색 쿼리 결과에 해당
  공지가 나오지 않는지 확인한다.
- 알림 중복 발송 방지 + pending 흐름 확인: 같은 (user_id, notice_id)로 `notify_logs`에
  `INSERT ... ON CONFLICT DO NOTHING`을 두 번 시도해 첫 번째만 `pending` 행을 만들고 두 번째는
  삽입되지 않는지 확인한다. 이어서 `UPDATE ... SET result = 'success', sent_at = now()`가
  정상 반영되는지 확인한다.
- 계정 정지 확인: 테스트 사용자를 `suspended_at`으로 정지시킨 뒤, notify-job 대상 선정 쿼리
  결과에서 제외되는지 확인한다.
- 로그 정리 잡 확인(승인 후 구현 시): 오래된 `started_at`/`requested_at` 값을 가진
  `collect_runs`/`api_usage_logs` 테스트 행을 넣고 `cleanup-logs` 잡 실행 후 삭제됐는지
  확인한다. `notify_logs`는 이 잡 대상이 아니므로 그대로 남는지도 함께 확인한다.
- 동의 재동의 강제 확인: 특정 `consent_type`에 옛 `policy_version`으로만 동의한 사용자 계정을
  만든 뒤, "현재 버전과 다르면 재동의 화면으로 보낸다" 판정 로직(애플리케이션)이 그 사용자를
  재동의 대상으로 분류하는지 확인한다.
- 동의 기록 보관 확인(보관 기간 확정 후): 탈퇴 처리 시 `consents.withdrawn_at`이 채워지고
  `user_id`가 null이 되는지, 보관 기간이 지난 뒤 정리 잡이 실행되면 그 행이 삭제되는지 확인한다.
- 로그인·가입 시도 제한 확인(0017, 확인 항목 29): 같은 `identifier_hash`로
  `attempt_type='login_failure'` 행을 15분 이내에 6번 넣고 판정 쿼리(위 `auth_attempts`
  절)의 count가 6으로 5 초과인지 확인한다. 15분보다 오래된 행만 있을 때는 count가 창 밖
  행을 세지 않는지도 확인한다. `attempt_type='signup_attempt'`도 같은 방식으로 확인한다.
- `auth_attempts` 정리 잡 확인(승인 후 구현 시): 1일 지난 `created_at` 값을 가진 테스트 행을
  넣고 `cleanup-auth-attempts` 잡 실행 후 삭제됐는지 확인한다.
- 알림 다중 기기 성공/실패 확인(0018, 확인 항목 30): 한 사용자에게 `push_subscriptions` 2개
  이상을 등록한 뒤, 그중 하나만 성공하도록 만들고 `notify_logs.result`가 `success`로,
  `failed_device_count`가 실패한 기기 수(예: 1)로 기록되는지 확인한다. 모두 실패하면
  `result='failed'`이고 `failed_device_count`가 시도한 기기 수 전체와 같은지 확인한다.
- 공개 API 차단 확인(0019, 확인 항목 35, 운영 DB):
  - 적용 전: `select tableowner from pg_tables where schemaname='public'`와 `DATABASE_URL`
    접속 롤이 같은지 확인한다. 다르거나 불확실하면 적용하지 않고 멈춰서 보고한다(RLS가 앱
    쿼리까지 막아 운영 장애로 이어질 수 있다).
  - 적용은 `begin; … commit;` 단일 트랜잭션으로 한다.
  - 적용 후: 위 "적용 후 점검" 절의 점검 SQL 2개(RLS 꺼진 테이블 0행, anon 권한 남은 테이블
    0행)를 실행하고, `get_advisors`(security)로 RLS 관련 경고 0건을 확인한다.
  - 권한 회수 확인: `set role anon; select * from public.users;`가 권한 오류로 막히는지
    확인한 뒤 `reset role`.
  - 미래 테이블 확인(반드시 트랜잭션 안에서만, 흔적을 남기지 않기 위해): `begin; create
    table public._probe(id int);`로 만든 테이블에 anon 권한이 없는지 확인한 뒤 `rollback;`.
  - 운영에서는 down→up 반복 롤백 테스트를 하지 않는다(되돌리는 동안 공개 접근이 다시 열리기
    때문). down 파일은 문법 검토만 한다. 반복 테스트는 개발용 Supabase 프로젝트가 생긴 뒤
    (프로젝트 문서 확인 항목 36)로 미룬다.
  - 앱 확인: `npm test`, `npm run build` 통과.
- 공지 컬럼 확인(0021, 확인 항목 55, 개발용 프로젝트 또는 `begin; … rollback;`):
  - 적용 후 `\d notices`에 `is_pinned boolean not null default false`, `image_count integer not null default 0`,
    `attachments jsonb not null default '[]'`가 있는지 확인한다. 기존 행이 있으면 기본값으로 채워졌는지 확인한다.
  - 기본값: 새 컬럼을 지정하지 않고 insert한 행이 `false`/`0`/`[]`인지, `attachments`에 null을 넣으면 거부되는지
    확인한다. `[{"name":"a.pdf","url":"https://..."}]` 값이 저장되고 읽히는지도 확인한다.
  - unique 해제 확인(55-j): `begin;` 안에서 `content_hash`가 같은 두 행(다른 `source_url`)을 insert하면 둘 다
    성공하는지, `source_url`이 같은 행을 insert하면 `notices_source_url_key` 위반으로 실패하는지 확인한 뒤
    `rollback;`. `select conname from pg_constraint where conrelid='public.notices'::regclass and contype='u';`가
    `notices_source_url_key`만 반환하는지도 본다.
  - down: 컬럼 3개가 사라지고 다른 컬럼 값이 그대로인지, 적용 → 롤백 → 재적용이 에러 없이 반복되는지 확인한다.
    같은 해시 행이 있는 상태에서 down의 unique 복원이 실패(트랜잭션 롤백, 컬럼도 그대로)하는지도 개발 프로젝트나
    `begin; … rollback;`에서 확인한다. 운영에서는 반복 테스트를 하지 않는다(백필 후 값 손실 위험).
  - 0019 점검: 운영 적용 뒤 "적용 후 점검" 절의 점검 SQL 2개가 0행인지, `set role anon; select is_pinned from
    public.notices;`가 권한 오류로 막히는지 확인한다(`reset role`로 복귀).
  - 앱 확인: `npm test`, `npm run build` 통과.
- 수집 잡 등록 확인(확인 항목 55, 승인 후 구현 시): 확장 설치 뒤 `select jobname, schedule, active from cron.job
  where jobname in ('collect-quick','collect-full');`가 2행이고 schedule이 각각 `*/10 * * * *`, `0 19 * * *`인지
  확인한다. 시크릿이 들어간 `command` 컬럼은 출력하지 않는다. 실행 이력은 `select jobid, status, return_message,
  start_time from cron.job_run_details order by start_time desc limit 20;`로 10분 간격 실행과 `succeeded`를 보고,
  HTTP 응답은 `net._http_response`의 `status_code`가 200대인지 본다(405면 경로·메서드, 401이면 시크릿 불일치).
  `collect_runs`에 `trigger_type='scheduled'` 행이 10분마다 생기는지, 진행 중 행이 끝나면 `finished_at`이 채워지는지도
  확인한다.
- 직전 문장 보관 확인(0020, 확인 항목 48(f), 안 2a, 개발용 프로젝트 또는 `begin; … rollback;`): 쿼리별 확인 ①~⑧은
  위 `user_preferences` 절의 "테스트 방법"에 있다(대체 후 id 불변·`previous_fact` = 옛 문장, 다른 사용자 id 차단,
  유사 갱신·PUT은 `previous_fact` 불변, swap 되돌리기). 마이그레이션 자체는 다음을 확인한다.
  - 적용 후 `\d user_preferences`에 `previous_fact text`(null 허용, default 없음)가 있고, 기존 행의 `previous_fact`가
    모두 null인지 확인한다.
  - cascade: `previous_fact`가 채워진 행을 가진 테스트 사용자를 삭제해 행이 오류 없이 사라지는지, 기억 DELETE 뒤 그
    행(`previous_fact` 포함)이 남지 않는지 확인한다.
  - down: 컬럼이 사라지고 다른 컬럼 값이 그대로인지, 적용 → 롤백 → 재적용이 에러 없이 반복되는지 확인한다.
  - 되돌리기 SQL: 대체 후 위 "되돌리기" (2)를 실행해 `preference_text`·`previous_fact`가 맞바뀌고 `embedding`이 $3으로
    바뀌는지, `previous_fact`가 null인 행과 다른 사용자의 id는 0행인지 확인한다.
  - 플랜 확인: 개발 환경에서 위 "조회 쿼리 2종"을 `EXPLAIN`으로 보고 어떤 스캔을 쓰는지 확인한다(쿼리가 바뀌지
    않았으므로 `previous_fact` 추가 전과 같아야 한다).

## 확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)

- 프로필 추가 항목 범위 — 해결(2026-09-27, user): 생년·성별·직군·재학/재직 여부 4개로 확정.
  [[anyang-service-scope]] (프로젝트 문서 확인 항목 2).
- 알림 시각 자유/고정 여부 — 해결(2026-09-27, user): 자유 설정 + on/off, 시간대는 Asia/Seoul
  고정. [[anyang-service-scope]] (프로젝트 문서 확인 항목 3).
- 수집 대상 게시판 — 해결(2026-09-27, user): 안양시 청년 게시판 1개로 확정
  ([[anyang-service-scope]]). 그 게시판의 실제 갱신 패턴(같은 글 수정 여부)에 따른 notices
  갱신·중복 판정 세부는 여전히 미해결(위 `notices` 절 참고) — 운영하며 관찰이 필요하다.
  collect-job 주기는 확인 항목 55로 `collect-quick` 10분 + `collect-full` 하루 1회(서울 04:00)로 바뀌었다(위 pg_cron 절).
- 처리방침·동의 화면 — 해결(2026-09-27, user): 채택. 가입 시 필수 동의 화면 + 동의 시각
  기록. [[anyang-service-scope]]. 동의 기록 구조(`consents` 테이블, 위 참고)도 구조 자체가
  확정됐다.
- 동의 항목 분리(수집·이용 / 국외 이전) — 해결(2026-09-27, user): 각각 별도로 받는다.
  [[anyang-service-scope]]. `consents.consent_type`으로 반영(위 참고, 구조 자체도 확정).
- 처리방침 개정 시 재동의 — 해결(2026-09-27, user): 강제한다. [[anyang-service-scope]].
  `policy_version` 비교 방식(위 `consents` 절)으로 반영(구조 자체도 확정).
- 회원 탈퇴 시 동의 기록(`consents`) 삭제/보존 여부 — 해결(2026-09-27, user): 즉시 삭제하지
  않고 증빙용으로 1년 보관 후 정리 잡으로 삭제. [[anyang-service-scope]]. `on delete set null` +
  `withdrawn_at`으로 반영(위 `consents` 절). 보관 기간(1년)도 해결됐다 — 정리 잡 등록 자체는
  구현 단계에서 별도 사용자 승인이 필요하다(위 `consents` 절, "되돌릴 수 없는 마이그레이션 표시" 참고).
- 관리자 기능 — 해결(2026-09-27, user): 역할 컬럼 없이 `ADMIN_EMAILS`, 기능 범위 ①~④
  확정. [[anyang-service-scope]]. 이를 담을 `collect_runs`/`notify_logs`/`api_usage_logs`
  테이블 구조, `notices.hidden_at`/`users.suspended_at` 컬럼도 구조 자체가 확정됐다.
- 로그성 테이블 보존 기간과 정리 잡 등록 여부 — 해결(2026-09-27, user): `collect_runs`/
  `api_usage_logs`는 90일 보존 후 정리 잡 등록(등록 자체는 승인됨, 구현 단계에서 실제
  실행). `notify_logs`는 중복 발송 방지에 쓰이므로 삭제 대상에서 제외. [[anyang-service-scope]].
- 알림 발송 로그 pending 상태 — 해결(2026-09-27, user): `notify_logs`에 발송 전 `pending`
  상태를 둔다. [[anyang-service-scope]]. `result` 값 셋과 `INSERT ... ON CONFLICT DO
  NOTHING` 선점 흐름으로 반영(위 `notify_logs` 절).
- 공지 자격요건 구조화 컬럼 — 해결(2026-09-27, user): 1차 출시에서 만들지 않는다.
  [[anyang-service-scope]]. 위 `notices` 절 제목에 명시.
- 프로필 코드값 셋 — 해결(2026-09-27, user): `gender`/`enrollment_status`/`occupation_type`
  코드값 셋이 [[anyang-service-scope#Details]]("프로필 선택지" 행)에서 확정됐다. 값 목록은
  그 결정 문서를 원본으로 삼는다(위 `profiles` 절 참고, 중복 기재 방지). 스키마 컬럼 타입
  자체도 다른 컬럼과 같이 설계 승인으로 확정됐다.
- 비밀번호 재설정 1차 출시 제외 — 해결(2026-09-27, user): 제외. [[anyang-service-scope]].
  관련 테이블(`verification_tokens` 등) 없음을 재확인 — 이 문서에 그런 테이블이 없다.
- "구독 수" 집계 기준 — 해결(backend): `notify_settings.enabled=true` 수와
  `push_subscriptions` 행 수 둘 다 반환하는 것으로 채택
  ([[anyang-backend-api#13-2. 알림 발송 현황]]).
- 공지 숨김을 쿼리 조건으로 처리할지, `notice_chunks` 물리 삭제로 처리할지 — 해결(backend):
  쿼리 조건(`notices.hidden_at is null`)을 기본안으로 채택
  ([[anyang-backend-api#5. 공지 수집기 (Collector)]]).
- `consents.policy_version` 부여 방식(날짜 기반 문자열 등)과 "현재 처리방침 버전" 상수 관리
  위치 — 해결(backend): 환경변수가 아니라 코드 상수(`lib/consent.ts`의
  `POLICY_VERSION`)로 관리하는 것으로 채택 ([[anyang-backend-api#1. 인증 (Auth.js v5)]]).
- 로그인 실패·가입 시도 제한 값 — 해결(2026-09-28, user): 로그인 실패는 같은 이메일 또는
  같은 IP 기준 15분에 5회 초과, 가입은 같은 IP 15분에 5회 초과 시 일시 차단, 외부 서비스
  없이 DB 기록. 비밀번호 최소 8자. [[anyang-youth-policy-assistant#확인이 필요한 항목]] 29.
  담을 `auth_attempts` 테이블 구조·해시 방식·보존 기간(1일)도 확정됐다(위
  `auth_attempts` 절 참고).
- 알림 다중 기기 성공/실패 판정 — 해결(2026-09-28, user): 기기 중 한 대라도 성공하면
  `success`, 실패 기기 수를 함께 기록. [[anyang-youth-policy-assistant#확인이 필요한 항목]]
  30. `notify_logs.failed_device_count` 컬럼으로 반영(위 `notify_logs` 절 참고).
- 공개 키(anon) 접근 차단 — 해결(2026-09-28, user): DB에 두 겹(현재 테이블 RLS + 미래 테이블
  기본 권한 회수)을 두고 적용 후 점검 SQL로 누락을 잡는다. 대상은 운영용 프로젝트(확인
  항목 34 해결과 연동). [[anyang-youth-policy-assistant#확인이 필요한 항목]] 35. `0019_lock_public_api`
  마이그레이션과 "공개 API 차단" 절로 반영(위 참고). 점검 SQL의 정확한 문구, `migrate.sh`
  출력 형식은 제안값으로 `` — 구현 단계에서 확정.
- 모순으로 대체되는 기억의 이력 — 해결(2026-10-03, user, [[anyang-youth-policy-assistant#확인이 필요한 항목]]
  48(f) 최종 결정): 안 2a — 같은 행을 UPDATE하고 직전 문장 1단계만 `previous_fact text`에 보관한다. 기억 id는
  바뀌지 않는다. 안 1(`superseded_at`/`superseded_by`)·안 2b(이력 테이블)는 채택하지 않는다. 이력은 모순 대체에만
  남기고 유사 갱신·사용자 수정은 `previous_fact`를 바꾸지 않는다(f-2). 보존 기간·정리 잡 없음(f-3), 기억 삭제 시
  같은 행이라 함께 삭제(f-4), 이전 문장 UI·되돌리기 API 없음·되돌리기는 운영자 SQL(f-5), 되돌리기는 swap이고 2단계
  이상 이전 판본 유실 수용(f-6), 0020 down 안전장치 없음(f-7). 반영 위치는 위 `user_preferences` 절과
  "마이그레이션 계획 (0020)"이다.
- 미확정 — 사용자가 기억 화면에서 문장을 직접 수정(PUT)할 때 `previous_fact`를 그대로 둘지 비울지는 사용자 결정
  범위 밖이다. 기존 동작 유지(건드리지 않음)로 적었다.
- 미확정 — 되돌리기(swap) 때 `updated_at`을 갱신할지(기본은 건드리지 않음)와, 되돌린 문장의 임베딩을 운영자가 계산해
  넘기는 방법(스크립트 등)은 backend 설계 몫이다(위 "되돌리기").
- 확인 항목 55(2026-10-04, 사용자 결정): `notices.is_pinned`·`image_count`·`attachments` 3개 컬럼과 기본값(0021),
  두 수집 잡의 cron 식, 링크만 저장, Realtime 없음은 확정이다. 반영 위치는 위 `notices` 절, "pg_cron / pg_net 잡 정의",
  "마이그레이션 계획 (0021)"이다.
- 미확정(55-f) — `collect-quick` 10분 주기를 5분·30분이나 야간 완화로 바꿀지. 값만 바뀌는 문제라 스키마 영향은 없다.
- 확정(55-j, 55-l, 사용자 결정 2026-10-04): `notices.content_hash` unique 해제(0021, 중복 판정은 `source_url`만),
  stale `running` 행 N=10분·`failed`로 정리 update(스키마 변경 없음). 반영 위치는 위 `notices` 절, `collect_runs` 절,
  "마이그레이션 계획 (0021)"이다.
- 미확정(55) — 겹침 방지에 advisory lock을 쓸지(backend 설계), `collect_runs.mode` 컬럼이 필요한지(스키마 변경 여부가
  걸려 있다, 위 `collect_runs` 절).
- 미확정 — 사용자당 기억 행 수 상한(위 "행 수 상한").
- 확인 요청(이 문서 범위 밖, 보류 f-8) — 직전 문장이 DB에 남는다는 사실이 처리방침·기억 화면 안내 문구("삭제하면
  사라진다" 등)와 맞는지는 frontend 재개 때 확인한다.

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-stack-database]]
- [[anyang-deployment-portability]]
- [[anyang-ai-models-data-transfer]]
- [[anyang-service-scope]]
- [[glossary]]
- [[anyang-backend-api]]
- [[anyang-backend-tasks]]
- [[anyang-frontend-screens]]
- [[anyang-backend-api-mihwakjeong-removal-corruption]]
