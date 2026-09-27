---
type: design
date: 2026-09-27
status: draft
owner: database
---

# 안양 청년정책 비서 — DB 스키마 설계

## Summary

PostgreSQL + pgvector 위에 사용자/인증, 프로필, 개인정보 동의 기록, 공지(notice)와 그 벡터
조각, 대화, 선호(preference) 벡터, 푸시 구독, 알림 설정 테이블을 둔다. 관리자 기능(수집 이력,
공지 숨김, 알림 발송 로그, 계정 정지, 외부 API 사용량)을 위한 로그성 테이블도 두되 개인별
대화·기억 원문은 담지 않는다. 스케줄은 Supabase
`pg_cron` + `pg_net`이 앱 API를
호출하는 방식으로 앱 쪽 로직만 트리거한다. 아래 테이블·컬럼·인덱스 세부는 모두 제안이며
사용자 설계 승인으로 확정되기 전까지 `(미확정)`이다.

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
  이 문서의 다른 값과 마찬가지로 (미확정) 제안이다. 관리자 화면에서도 개인별 대화·기억 원문은
  보이지 않는다(집계·메타데이터만) — 이 원칙에 따라 아래 로그 테이블은 대화 내용을 담지 않는다.

## Details

### 용어

이 문서의 표는 [[glossary]]의 도메인 용어(user, profile, notice, preference, notify-time,
conversation, push-subscription, collect-job, notify-job)를 그대로 쓴다. 새 용어는 추가하지 않았다.

### 테이블 제안 (모두 미확정)

#### users (미확정)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| email | text, unique, not null | |
| email_verified | timestamptz, null 허용 | Auth.js 어댑터 규격 |
| name | text, null 허용 | 화면 표시용, 필수 아님(개인정보 최소화) |
| created_at | timestamptz, default now() | |
| suspended_at | timestamptz, null 허용 | 관리자가 계정을 정지한 시각. null이면 정상 상태(제안). 정지 사유를 남길지는 미확정 — 필요하면 별도 컬럼(예: `suspended_reason text`) 추가(되돌릴 수 있는 마이그레이션) |

- **정지 계정 처리 방식**: [[anyang-backend-api#1-2. 정지 계정 제한 방식]]에서 정리한다 — 로그인은 허용, 제한
  상태(제안, 미확정). 알림(notify-job)은 `suspended_at`이 not null인 사용자를 조회 대상에서
  제외한다(아래 pg_cron 절 쿼리, `u.suspended_at is null` 조건). 정지는 로그인 계정(`users`)
  단위이므로 `credentials`/`accounts`를 따로 건드리지 않는다.
- **계정 삭제**는 이 컬럼과 무관하게 기존 cascade 정책(위 각 테이블 `on delete cascade`)을 그대로
  따른다 — `users` 행 삭제 시 profiles/accounts/credentials/conversations/push_subscriptions/
  notify_settings/user_preferences가 함께 삭제된다. `consents`만 예외다 — `on delete set null`이므로
  `users` 행이 삭제돼도 `consents` 행은 남는다(증빙 보관 목적, 아래 `consents` 절 참고). 탈퇴
  처리 순서(애플리케이션 책임, 제안): ① `consents.withdrawn_at` 채우기 → ② `users` 행 삭제(나머지
  cascade 테이블은 이때 함께 삭제됨).

#### accounts (미확정) — OAuth 연동, Auth.js 어댑터 규격 기본안

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

#### credentials (미확정) — 자체 회원가입(이메일·비밀번호)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_id | uuid, PK, FK → users.id, on delete cascade | |
| password_hash | text, not null | bcrypt/argon2 등 backend가 정함. 평문 저장 금지 |
| updated_at | timestamptz | |

- Auth.js 표준 스키마에는 없는 테이블이라 backend가 자체 credentials provider를 쓸 때만 필요.
  backend 조율에서 최종 확정.

#### profiles (미확정 — 컬럼 타입은 설계 승인 전, 항목 범위와 코드값 셋은 확정)

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

#### notices (미확정) — 공지 자격요건 구조화 컬럼 없음(확정)

공지 자격요건(연령·직군 등 조건)을 구조화된 컬럼으로 저장하지 않는 것은 1차 출시 범위로
확정됐다([[anyang-service-scope]], user, 2026-09-27). 아래 표에 그런 컬럼을 두지 않는다 —
자격요건 판단은 `body`(본문 텍스트)와 벡터 검색·LLM 판단에 맡긴다(애플리케이션 책임).

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| source_url | text, unique, not null | 원문 URL |
| title | text, not null | |
| body | text, not null | 본문. 임베딩 입력으로 쓰인다 |
| content_hash | text, unique, not null | 본문(또는 제목+본문) 해시. 같은 공지 재수집 시 중복 방지 |
| published_at | timestamptz, null 허용 | 게시일. 게시판에 없으면 null |
| collected_at | timestamptz, default now() | |
| hidden_at | timestamptz, null 허용 | 관리자가 잘못 수집된 공지를 숨긴 시각. null이면 정상 노출(제안, [[glossary]]의 notice-hidden) |
| hidden_reason | text, null 허용 | 숨김 사유(관리자가 입력, 필수 아님) |

- 인덱스: unique(content_hash) — 중복 방지의 핵심. unique(source_url)도 별도로 둔다(같은 글이
  URL은 같은데 본문만 갱신되는 경우 구분 필요 여부는 미확정 — 수집 대상 게시판은
  https://www.anyang.go.kr/youth/selectBbsNttList.do?bbsNo=1184&key=3543 로 확정됐으나
  ([[anyang-service-scope]]), 그 게시판의 실제 갱신 패턴(같은 글 수정 여부)은 아직 관찰되지
  않아 미확정으로 남는다).
- **숨김 처리와 추천·검색 제외 (제안)**: `hidden_at is not null`인 공지는 사용자 노출·추천·
  벡터 검색 결과에서 제외한다. 두 가지 구현 방식 중 하나를 backend가 고른다.
  1. 매 조회 쿼리(추천 목록, `notice_chunks` 벡터 유사도 검색의 조인 대상)에 `notices.hidden_at
     is null` 조건을 추가한다 — 스키마 변경 없이 애플리케이션/쿼리 책임으로 끝난다(제안, 별도
     마이그레이션 불필요).
  2. 숨김 시 `notice_chunks`에서 해당 `notice_id`의 행을 물리 삭제해 검색 인덱스에서 완전히
     제거한다 — 다시 숨김 해제하면 재임베딩이 필요해 되돌리기 비용이 크므로 권장하지 않는다(제안).
  기본안은 1번이다. 최종 선택은 backend 조율 후 확정한다.

#### notice_chunks (미확정) — 벡터 검색용

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| notice_id | uuid, FK → notices.id, on delete cascade | |
| chunk_text | text, not null | 공지 본문을 나눈 조각. 통째로 넣을지 분할할지는 미확정 |
| embedding | VECTOR(768) | `gemini-embedding-001`을 `output_dimensionality=768`로 축소한 값(공식 문서 확인 완료, 위 Context 참고) |
| embedding_model | text, not null | 예: `gemini-embedding-001`. 모델 교체 이력 추적용 |
| created_at | timestamptz, default now() | |

- 인덱스: HNSW(embedding) — pgvector의 `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`
  (거리 함수는 미확정, 코사인 유사도 제안).
- **모델 교체 시 재임베딩 절차 (제안)**:
  1. 새 모델명을 `embedding_model`에 구분해 새 행으로 추가하거나, 배치 잡으로 전체 재계산 후
     `embedding_model` 값을 일괄 갱신한다(어느 쪽이든 서비스 중단 없이 진행 가능하도록 컬럼에
     모델명을 남긴다).
  2. 차원이 달라지면 `VECTOR(n)` 컬럼 타입 자체를 바꿔야 하므로 새 컬럼을 추가하고 재계산이
     끝난 뒤 기존 컬럼을 지우는 방식을 쓴다(컬럼 타입을 바로 ALTER하면 기존 벡터가 무의미해짐).
  3. HNSW 인덱스는 재계산이 끝난 뒤 새로 만든다(오래 걸리는 재구축 작업이므로 배치 시간대에).

#### conversations / messages (미확정)

대화 히스토리 목록 화면([[anyang-service-scope]], user, 2026-09-27 확정)이 있어야 하므로
`conversations`에 목록 표시용 컬럼을 둔다.

| 테이블 | 컬럼 | 설명 |
|---|---|---|
| conversations | id uuid PK, user_id uuid FK→users.id, title text null 허용, created_at, updated_at | 대화 한 묶음. `title`은 목록 화면에 보여줄 제목(미확정 — 자동 생성 방식은 backend가 정함, 예: 첫 메시지 요약). `updated_at`은 마지막 메시지 시각으로 갱신(애플리케이션 책임) |
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

#### user_preferences (미확정) — 대화에서 추출한 선호, 벡터. "AI가 기억하는 내 정보" 화면의 데이터

"AI가 기억하는 내 정보" 화면은 조회·수정·삭제를 지원한다([[anyang-service-scope]], user,
2026-09-27 확정). 삭제는 행 삭제(DELETE)로 충분하다. 수정은 `preference_text`를 사용자가
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

- 인덱스: HNSW(embedding).
- **수정 시 재임베딩 필요(제안)**: `preference_text`는 의미 기반 검색(코사인 유사도)의 입력이므로,
  텍스트를 고치면 `embedding`을 반드시 다시 계산해 함께 갱신한다. 텍스트만 바꾸고 `embedding`을
  갱신하지 않으면 검색 결과가 실제 문장과 어긋난다. 이 재계산은 행 하나 단위라 재임베딩 절차
  (아래 `notice_chunks`의 모델 교체 절차)와 달리 컬럼 구조 변경이 없어 되돌릴 수 없는 마이그레이션이
  아니다 — 애플리케이션이 UPDATE 시점에 동기로 처리한다(backend 설계에서 확정).

#### consents (미확정) — 가입 시 개인정보 필수 동의 기록

가입 시(Google·이메일 모두) 개인정보 필수 동의 화면을 두고 동의 시각을 기록하는 것은 확정
([[anyang-service-scope]], user, 2026-09-27). 동의 항목을 "수집·이용"(collection_use)과
"국외 이전"(overseas_transfer)으로 분리해 각각 받는 것, 처리방침 개정 시 재동의를 강제하는 것,
탈퇴 후에도 동의 기록을 즉시 삭제하지 않고 증빙용으로 일정 기간 보관하는 것도 확정
([[anyang-service-scope]], user, 2026-09-27). 아래 테이블 구조·컬럼 자체는 이 확정을 담기
위한 제안이며 (미확정)이다.

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

#### push_subscriptions (미확정)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete cascade | |
| endpoint | text, unique, not null | Web Push 구독 endpoint |
| p256dh / auth | text, not null | Web Push 키 |
| created_at | timestamptz, default now() | |

#### notify_settings (미확정 — 컬럼 타입은 설계 승인 전, 항목 범위·시간대는 확정)

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

- **알림 대상 공지 범위 (제안, 미확정)**: "알림을 켠 시각 이후 수집된 공지만" 알림 대상으로
  삼는다 — 가입(또는 재가입) 직후 과거에 쌓인 공지가 한꺼번에 발송되는 것을 막기 위함이다.
  `/api/jobs/notify`의 매칭 쿼리(backend, [[anyang-backend-api#7. 스케줄러 — 수집 잡 / 알림
  잡]])에 `notices.collected_at > notify_settings.enabled_at` 조건을 추가하는 방식을 제안한다.
  이제 가입 시점부터 `enabled_at`이 항상 채워지므로, `enabled_at`이 null인 행은 이 컬럼을
  도입하기 전에 만들어진 레거시 행뿐이다. 이 경우 **발송 대상에서 제외한다(제안, 미확정)** —
  "생성 시각 기준으로 간주" 대안도 있으나, 레거시 행의 실제 온/오프 이력을 알 수 없어 안전한
  쪽(제외)을 기본안으로 둔다. 최종 채택 여부와 정확한 비교 조건, 레거시 행 처리(마이그레이션
  시 `enabled_at`을 일괄 채울지)는 backend 조율 후 확정한다.
- `notify_time`은 `time` 범위(00:00~23:59)만 검증하면 된다(애플리케이션 책임, CHECK 제약 불필요).
- 시간대 처리: `notify_time`은 시간대 정보가 없는 `time` 타입이므로, "지금이 사용자의 알림
  시각인지" 비교할 때는 항상 `timezone`(Asia/Seoul 고정) 기준으로 현재 시각을 변환해 비교한다.
  DB 서버의 시스템 시간대나 `now()`의 UTC 값을 그대로 비교하지 않는다(애플리케이션/쿼리 책임,
  아래 pg_cron/pg_net 절 참고).

#### collect_runs (미확정) — 관리자 화면 "공지 수집 관리"용, [[glossary]]의 collect-run

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
- collect-job(수집 잡) 실행 시작 시 1행을 만들고(`status='running'`), 끝나면 `finished_at`·
  `status`·`collected_count`·`error_summary`를 갱신한다(애플리케이션 책임).
- 관리자 화면의 "수동 수집 실행"은 이 테이블에 `trigger_type='manual'` 행을 만들며 잡을
  즉시 실행하는 API 엔드포인트로 구현한다(backend 설계에서 확정).

#### notify_logs (미확정) — 관리자 화면 "알림 발송 현황"용 + 중복 발송 방지, [[glossary]]의 notify-log

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete cascade | |
| notice_id | uuid, FK → notices.id, on delete cascade | |
| reserved_at | timestamptz, not null, default now() | 발송 전 선점(행 INSERT) 시각. "언제부터 이 (사용자,공지) 조합을 처리 중이었는지" 추적용 |
| sent_at | timestamptz, null 허용 | 실제 발송(성공/실패 확정) 시각. `pending` 상태에서는 null |
| result | text, not null, default 'pending' | `pending`(선점됨, 발송 전) / `success` / `failed`. 값 셋은 제안 |
| error_summary | text, null 허용 | 실패 사유 요약(예: push 구독 만료) |

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

#### api_usage_logs (미확정) — 관리자 화면 "외부 API 사용량"용, [[glossary]]의 api-usage-log

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
  참고)라 이 절의 정리 대상이 아니다.
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

### pg_cron / pg_net 잡 정의 (미확정)

이전 가능성 원칙에 따라 스케줄 로직 본체는 앱 API 엔드포인트에 둔다. pg_cron은 트리거만 한다.

```sql
-- 제안: 5분마다 알림 잡 트리거 (미확정 — [[anyang-backend-api#7. 스케줄러 — 수집 잡 / 알림 잡]]과
-- 5분 창 방식으로 통일함, 주기 자체의 최종 확정은 backend와 조율)
select cron.schedule(
  'notify-job-trigger',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '앱 API URL(미확정, 환경변수로 관리)',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-scheduler-secret', '공유 시크릿(미확정, 환경변수/Supabase Vault로 관리, 문서에 값 기록 금지)'
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
- collect-job(공지 수집) 트리거도 같은 방식(pg_cron + pg_net)을 기본안으로 제안한다. Vercel Cron은
  이전 가능성 원칙 3에 따라 쓰지 않는다. 주기는 하루 1회(미확정 제안) — 게시판이 관공서 공지
  게시판이라 실시간성 요구가 낮고, 무료 티어 리소스(pg_net 호출, Vercel 함수 실행)를 아끼기
  위함이다. 시각은 사용자 트래픽이 적은 새벽(예: Asia/Seoul 04:00, 미확정 제안)으로 잡아 알림
  잡보다 충분히 먼저 끝나게 한다.
  ```sql
  -- 제안(미확정): 매일 새벽 1회 수집 잡 트리거 (UTC 19:00 = Asia/Seoul 04:00)
  select cron.schedule(
    'collect-job-trigger',
    '0 19 * * *',
    $$
    select net.http_post(
      url := '앱 API URL(미확정, 환경변수로 관리)',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-scheduler-secret', '공유 시크릿(미확정, 환경변수로 관리, 문서에 값 기록 금지)'
      )
    );
    $$
  );
  ```
- UNO Q 전환 시 트리거만 `리눅스 cron + curl`로 교체하고 잡 로직(앱 API)은 그대로 둔다
  ([[anyang-deployment-portability#이전 가능성 원칙 (Vercel+Supabase ↔ UNO Q)]]).

### 마이그레이션 도구 (미확정)

- Supabase 대시보드 전용 마이그레이션(Supabase CLI의 Supabase 전용 기능)은 이전 가능성 원칙과
  충돌할 수 있어 쓰지 않는다(제안). 대신 표준 PostgreSQL에서도 동작하는 SQL 마이그레이션 도구
  (예: `node-pg-migrate`, `drizzle-kit`, 순수 `.sql` 파일 + `psql`)를 backend와 조율해 고른다.
  선택 기준: `DATABASE_URL` 하나로 개발/운영/UNO Q 어디서든 실행 가능해야 한다.
- 개발/운영 Supabase 프로젝트는 별도로 둔다([[anyang-deployment-portability]] 확정). 각 환경은
  독립된 `DATABASE_URL`을 쓰고, 같은 마이그레이션 파일을 순서대로 적용한다.

### 되돌릴 수 없는 마이그레이션 표시

- 이 설계 단계에서는 신규 테이블/컬럼 생성만 다룬다. 되돌릴 수 없는 마이그레이션(테이블·컬럼
  삭제, 데이터 삭제, 타입 축소)은 없다.
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

## 테스트 방법 (제안)

- 마이그레이션 적용: 개발용 Supabase 프로젝트의 `DATABASE_URL`로 마이그레이션 도구를 실행하고
  `psql`에서 `\d 테이블명`으로 컬럼·제약·인덱스가 설계대로 생성됐는지 확인한다.
- 롤백 확인: 각 마이그레이션 파일마다 대응하는 down 마이그레이션(테이블 생성의 역은 `DROP TABLE`)을
  만들고, 적용 → 롤백 → 재적용이 에러 없이 반복되는지 확인한다. 컬럼 추가류는 `DROP COLUMN`으로
  간단히 되돌아가지만, 위 "되돌릴 수 없는 마이그레이션"에 해당하면 롤백 대신 사용자 승인 절차를
  따른다.
- 제약 확인 쿼리 예시:
  - unique 확인: `SELECT content_hash, count(*) FROM notices GROUP BY content_hash HAVING count(*) > 1;` (0행이어야 함)
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

## 확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)

- 프로필 추가 항목 범위 — 해결(2026-09-27, user): 생년·성별·직군·재학/재직 여부 4개로 확정.
  [[anyang-service-scope]] (프로젝트 문서 확인 항목 2).
- 알림 시각 자유/고정 여부 — 해결(2026-09-27, user): 자유 설정 + on/off, 시간대는 Asia/Seoul
  고정. [[anyang-service-scope]] (프로젝트 문서 확인 항목 3).
- 수집 대상 게시판 — 해결(2026-09-27, user): 안양시 청년 게시판 1개로 확정
  ([[anyang-service-scope]]). 그 게시판의 실제 갱신 패턴(같은 글 수정 여부)에 따른 notices
  갱신·중복 판정 세부는 여전히 미해결(위 `notices` 절 참고) — 운영하며 관찰이 필요하다.
  collect-job 주기는 하루 1회(미확정 제안, 위 pg_cron 절 참고)로 남겨뒀다.
- 처리방침·동의 화면 — 해결(2026-09-27, user): 채택. 가입 시 필수 동의 화면 + 동의 시각
  기록. [[anyang-service-scope]]. 동의 기록 구조(`consents` 테이블, 위 참고)는 구조 자체가
  아직 (미확정)이다.
- 동의 항목 분리(수집·이용 / 국외 이전) — 해결(2026-09-27, user): 각각 별도로 받는다.
  [[anyang-service-scope]]. `consents.consent_type`으로 반영(위 참고, 구조 자체는 미확정).
- 처리방침 개정 시 재동의 — 해결(2026-09-27, user): 강제한다. [[anyang-service-scope]].
  `policy_version` 비교 방식(위 `consents` 절)으로 반영(구조 자체는 미확정).
- 회원 탈퇴 시 동의 기록(`consents`) 삭제/보존 여부 — 해결(2026-09-27, user): 즉시 삭제하지
  않고 증빙용으로 1년 보관 후 정리 잡으로 삭제. [[anyang-service-scope]]. `on delete set null` +
  `withdrawn_at`으로 반영(위 `consents` 절). 보관 기간(1년)도 해결됐다 — 정리 잡 등록 자체는
  구현 단계에서 별도 사용자 승인이 필요하다(위 `consents` 절, "되돌릴 수 없는 마이그레이션 표시" 참고).
- 관리자 기능 — 해결(2026-09-27, user): 역할 컬럼 없이 `ADMIN_EMAILS`, 기능 범위 ①~④
  확정. [[anyang-service-scope]]. 이를 담을 `collect_runs`/`notify_logs`/`api_usage_logs`
  테이블 구조, `notices.hidden_at`/`users.suspended_at` 컬럼은 구조 자체가 아직 (미확정)이다.
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
  자체는 다른 컬럼과 같이 설계 승인 전까지 (미확정)이다.
- 비밀번호 재설정 1차 출시 제외 — 해결(2026-09-27, user): 제외. [[anyang-service-scope]].
  관련 테이블(`verification_tokens` 등) 없음을 재확인 — 이 문서에 그런 테이블이 없다.
- "구독 수" 집계 기준 — 해결(backend): `notify_settings.enabled=true` 수와
  `push_subscriptions` 행 수 둘 다 반환하는 것으로 채택
  ([[anyang-backend-api#13-2. 알림 발송 현황]]).
- 공지 숨김을 쿼리 조건으로 처리할지, `notice_chunks` 물리 삭제로 처리할지 — 해결(backend):
  쿼리 조건(`notices.hidden_at is null`)을 기본안으로 채택
  ([[anyang-backend-api#5. 공지 수집기 (Collector)]]).
- `consents.policy_version` 부여 방식(날짜 기반 문자열 등)과 "현재 처리방침 버전" 상수 관리
  위치 — 해결(backend): 환경변수가 아니라 코드 상수(`lib/consent.ts`(미확정 경로)의
  `POLICY_VERSION`)로 관리하는 것으로 채택 ([[anyang-backend-api#1. 인증 (Auth.js v5)]]).

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
