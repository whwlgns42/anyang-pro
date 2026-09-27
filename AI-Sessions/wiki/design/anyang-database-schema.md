---
type: design
date: 2026-09-27
status: draft
owner: database
---

# 안양 청년정책 비서 — DB 스키마 설계

## Summary

PostgreSQL + pgvector 위에 사용자/인증, 프로필, 공지(notice)와 그 벡터 조각, 대화, 선호(preference)
벡터, 푸시 구독, 알림 설정 테이블을 둔다. 스케줄은 Supabase `pg_cron` + `pg_net`이 앱 API를
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
  고려). backend가 웹 접근 도구 없이 학습 지식만으로 제안한 값이라 공식 문서로 재확인하지
  못했다 — 모델명·차원 자체는 **(미확정, 공식 문서 재확인 대기)**다. 아래 `notice_chunks`,
  `user_preferences`의 `embedding` 컬럼 타입은 이 제안을 반영해 `VECTOR(768)`로 표기하되,
  구현 착수 전 backend가 공식 문서로 재확인한 뒤에야 확정된다. 재확인 결과 차원이 다르면
  구현 전에 이 문서를 다시 고친다. 모델 교체 시 재임베딩 절차는 아래 별도로 둔다.
- 인증 라이브러리: 2026-09-27 backend 확정 제안 — Auth.js(NextAuth) v5, Credentials
  provider(이메일·비밀번호, bcrypt 해시) + Google OAuth provider 병행. 표준 PostgreSQL 어댑터
  스키마(users/accounts/verification_tokens) + 자체 `credentials` 테이블 구성을 그대로 쓴다.
  세션 전략은 JWT(쿠키)로, DB 세션 테이블은 쓰지 않는다 — 이전 가능성 원칙(표준 스키마만 사용)과
  충돌하지 않고 세션 테이블 관리 부담도 없앤다. 아래 테이블 제안은 이 전제로 갱신했다.
  라이브러리·전략 자체는 backend 제안이며 사용자 설계 승인으로 확정된다.

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
(이메일 인증·비밀번호 재설정 등에 쓰는 Auth.js 표준 테이블)는 필요 여부가 아직 backend 설계에서
정해지지 않아 이 문서에 추가하지 않았다 — 필요해지면 backend 조율 후 추가한다.

#### credentials (미확정) — 자체 회원가입(이메일·비밀번호)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_id | uuid, PK, FK → users.id, on delete cascade | |
| password_hash | text, not null | bcrypt/argon2 등 backend가 정함. 평문 저장 금지 |
| updated_at | timestamptz | |

- Auth.js 표준 스키마에는 없는 테이블이라 backend가 자체 credentials provider를 쓸 때만 필요.
  backend 조율에서 최종 확정.

#### profiles (미확정)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_id | uuid, PK, FK → users.id, on delete cascade | |
| birth_year | smallint, null 허용 | 나이대 계산용. 생년월일 전체 저장은 개인정보 최소화 관점에서 비권장(제안) |
| gender | text, null 허용 | 선택값. 코드값 셋은 미확정 |
| occupation_type | text, null 허용 | 직군. 코드값 셋은 미확정 |
| residency | boolean, null 허용 | 안양시 거주 여부 |
| updated_at | timestamptz | |

- 프로필 추가 항목(재학/재직 여부, 소득 구간 등)은 미확정 — 프로젝트 문서 확인 항목 2.
  개인정보 최소화 관점 선택지:
  1. 지금 확정된 4개 항목(출생연도·성별·직군·거주 여부)만으로 시작하고 추가 항목은 나중에 컬럼을
     더하는 방식(마이그레이션 비용 낮음, ALTER TABLE ADD COLUMN은 되돌릴 수 있는 마이그레이션).
  2. 소득 구간처럼 민감도가 높은 항목은 구간(bucket) 코드로만 저장하고 원 소득액은 받지 않는다.
  3. 모든 프로필 항목은 null 허용으로 두어 미입력 시에도 서비스 이용 가능하게 한다(강제 입력 최소화).

#### notices (미확정)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| source_url | text, unique, not null | 원문 URL |
| title | text, not null | |
| body | text, not null | 본문. 임베딩 입력으로 쓰인다 |
| content_hash | text, unique, not null | 본문(또는 제목+본문) 해시. 같은 공지 재수집 시 중복 방지 |
| published_at | timestamptz, null 허용 | 게시일. 게시판에 없으면 null |
| collected_at | timestamptz, default now() | |

- 인덱스: unique(content_hash) — 중복 방지의 핵심. unique(source_url)도 별도로 둔다(같은 글이
  URL은 같은데 본문만 갱신되는 경우 구분 필요 여부는 미확정 — 수집 대상 게시판이 정해지지 않아
  갱신 패턴을 알 수 없음, 확인 항목 1과 연결).

#### notice_chunks (미확정) — 벡터 검색용

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| notice_id | uuid, FK → notices.id, on delete cascade | |
| chunk_text | text, not null | 공지 본문을 나눈 조각. 통째로 넣을지 분할할지는 미확정 |
| embedding | VECTOR(768) (미확정, 공식 문서 재확인 대기) | `gemini-embedding-001`을 `output_dimensionality=768`로 축소한 값(backend 제안). 구현 전 공식 문서 재확인 필요 |
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

| 테이블 | 컬럼 | 설명 |
|---|---|---|
| conversations | id uuid PK, user_id uuid FK→users.id, created_at | 대화 한 묶음 |
| messages | id uuid PK, conversation_id uuid FK→conversations.id, role text(user/assistant), content text, created_at | 개별 발화 |

- DeepSeek로 보내는 값은 조건(나이대·성별·직군)뿐이라는 원칙([[anyang-ai-models-data-transfer]])은
  앱 코드에서 지킨다. `messages.content`에 식별정보를 넣지 않는 것은 스키마가 아니라 애플리케이션
  책임이므로 이 설계에서 강제하지 않는다(참고로 남김).

#### user_preferences (미확정) — 대화에서 추출한 선호, 벡터

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete cascade | |
| preference_text | text, not null | 추출된 선호 문장. Gemini 임베딩 입력(식별정보 없이 문장만) |
| embedding | VECTOR(768) (미확정, 공식 문서 재확인 대기) | notice_chunks와 같은 모델·차원(backend 제안, 공식 문서 재확인 대기)을 따른다 |
| embedding_model | text, not null | |
| source_conversation_id | uuid, FK → conversations.id, null 허용 | 어느 대화에서 추출됐는지 추적 |
| created_at | timestamptz, default now() | |

- 인덱스: HNSW(embedding).

#### push_subscriptions (미확정)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id, on delete cascade | |
| endpoint | text, unique, not null | Web Push 구독 endpoint |
| p256dh / auth | text, not null | Web Push 키 |
| created_at | timestamptz, default now() | |

#### notify_settings (미확정)

알림 시각이 자유 설정인지 고정 선택지인지 미확정(확인 항목 3). 두 경우 모두 아래 스키마로
수용 가능하다는 것이 제안이다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_id | uuid, PK, FK → users.id, on delete cascade | |
| notify_time | time, not null | 자유 설정이면 사용자가 고른 아무 시각, 고정 선택지면 그 선택지 중 하나(예: 09:00/12:00/18:00)를 그대로 저장. 둘 다 컬럼 타입은 `time`으로 동일 |
| enabled | boolean, default true | 알림 on/off |
| timezone | text, default 'Asia/Seoul' | 확장 대비. 서비스가 국내 전용이면 생략 가능(미확정) |

- 고정 선택지로 정해지면 애플리케이션(또는 CHECK 제약)에서 허용값만 걸러도 되고, 자유 설정이면
  제약 없이 `time` 범위(00:00~23:59)만 검증한다. 스키마 자체는 바뀌지 않으므로 이 결정은
  마이그레이션 없이 애플리케이션 검증 규칙 변경만으로 수용 가능하다.

### pg_cron / pg_net 잡 정의 (미확정)

이전 가능성 원칙에 따라 스케줄 로직 본체는 앱 API 엔드포인트에 둔다. pg_cron은 트리거만 한다.

```sql
-- 제안: 5분마다 알림 잡 트리거 (미확정 — 주기는 backend와 조율 필요)
select cron.schedule(
  'notify-job-trigger',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '앱 API URL(미확정, 환경변수로 관리)',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-notify-job-secret', '공유 시크릿(미확정, 환경변수/Supabase Vault로 관리, 문서에 값 기록 금지)'
    )
  );
  $$
);
```

- 공유 시크릿 헤더로 앱 API가 pg_net 호출만 수락하도록 검증한다(구체 헤더명·검증 로직은
  backend 설계에서 확정).
- collect-job(공지 수집) 트리거도 같은 방식(pg_cron + pg_net)을 기본안으로 제안한다. Vercel Cron은
  이전 가능성 원칙 3에 따라 쓰지 않는다. 주기는 미확정(수집 대상 게시판이 아직 없어 확인 항목 1과
  연결).
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
    conversations/push_subscriptions/notify_settings/user_preferences 행이 함께 삭제됐는지 확인.
- 인덱스 확인: `EXPLAIN ANALYZE`로 벡터 유사도 검색 쿼리가 HNSW 인덱스를 쓰는지(`Index Scan using ... hnsw`)
  확인한다. 데이터가 적을 때는 planner가 seq scan을 고를 수 있어 테스트 데이터가 어느 정도
  있어야 유효하다.
- pg_cron/pg_net: 개발 프로젝트에서 잡을 등록하고 `cron.job_run_details` 테이블로 실행 이력과
  `net.http_post` 응답 상태코드를 확인한다.

## 확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)

- 프로필 추가 항목 범위 (프로젝트 문서 확인 항목 2에 이미 등록됨).
- 알림 시각 자유/고정 여부 (프로젝트 문서 확인 항목 3에 이미 등록됨).
- 수집 대상 게시판에 따른 notices 갱신·중복 판정 세부, collect-job 주기 (확인 항목 1과 연결).

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-stack-database]]
- [[anyang-deployment-portability]]
- [[anyang-ai-models-data-transfer]]
- [[glossary]]
- [[anyang-backend-api]]
- [[anyang-backend-tasks]]
- [[anyang-frontend-screens]]
