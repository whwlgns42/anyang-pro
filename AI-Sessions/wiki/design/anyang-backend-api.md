---
type: design
date: 2026-09-27
status: draft
owner: backend
---

# 안양 청년정책 비서 — Backend API 계약 설계

## Summary

Next.js(App Router) Route Handler로 인증, 프로필 CRUD, 채팅(DeepSeek 스트리밍 + RAG),
Gemini 임베딩, 공지 수집기, 임베딩 파이프라인, 스케줄러(수집·알림 잡), Web Push를 제공한다.
스키마는 [[anyang-database-schema]]를 따른다. 이 문서의 엔드포인트·값은 모두 제안이며
`(미확정)`이고, 사용자 설계 승인으로 확정된다.

**공식 문서로 확인 못 한 수치**: 이 에이전트는 웹 접근 도구(WebFetch/WebSearch)가 없어
Gemini 임베딩 무료 티어 요청 한도, DeepSeek API 요청 한도, Vercel Hobby 함수 실행 시간 한도를
공식 문서로 재확인하지 못했다. 아래 해당 항목마다 "확인 못 함(도구 접근 불가)"로 표시했다.
**구현 착수 전 반드시 공식 문서로 재확인해야 한다** — 미해결 질문에도 남긴다.

## Context

- 확정: 인증은 Google 소셜 + 이메일·비밀번호 [[anyang-login-method]]. AI는 대화 DeepSeek,
  임베딩 Gemini, 식별정보 전송 금지 [[anyang-ai-models-data-transfer]]. 배포 Vercel
  Hobby(icn1)+Supabase 무료, 이전 가능성 원칙 [[anyang-deployment-portability]].
- database와 조율(2026-09-27, [[anyang-database-schema]]):
  - 인증 라이브러리: Auth.js(NextAuth) v5, Credentials(이메일·비밀번호) + Google OAuth
    provider 병행, JWT 세션 전략(DB sessions 테이블 미사용 — 이전 가능성 원칙에 맞게 세션을
    DB에 의존하지 않음).
  - 임베딩 모델·차원: `gemini-embedding-001`, `output_dimensionality=768` 제안
    (미확정, 공식 문서 재확인 대기 — 위 "확인 못 한 수치" 참고). database 문서의
    `notice_chunks.embedding` / `user_preferences.embedding`이 `VECTOR(768)`로 갱신됨.
- 공지 수집 대상 게시판 URL은 미확정([[anyang-youth-policy-assistant#확인이 필요한 항목]]
  1번, 사용자 제공 대기). 아래 파서 설계는 게시판 구조 확인 전 뼈대만 다룬다.
- 알림 시각 자유/고정 여부 미확정(확인 항목 3). `notify_settings.notify_time` 컬럼은 두 경우 다 수용.
- 커스텀 도메인 미확정(확인 항목 7). OAuth 리다이렉트 URI, VAPID subject, 웹 푸시 origin에
  영향이 있어 `APP_ORIGIN` 환경변수로만 참조한다(하드코딩 금지).

## Details

### 1. 인증 (Auth.js v5)

- 마운트: `app/api/auth/[...nextauth]/route.ts` (미확정 — Auth.js v5 App Router 컨벤션).
- Provider: `Google`(OAuth), `Credentials`(email/password).
- 세션 전략: `strategy: "jwt"`. DB에 세션 테이블을 두지 않는다.
- 비밀번호 해시: `argon2id`(제안, 미확정) — bcrypt보다 GPU 공격 저항이 높다. 파라미터
  (memory/time cost)는 미확정.
- 전용 엔드포인트(Auth.js가 커버하지 않는 것만):
  - `POST /api/auth/register` (미확정) — body `{ email, password }`. `credentials` 테이블에
    `password_hash` 저장. 이미 가입된 email이면 409.
- Auth.js 표준 콜백(`signIn`, `session`, `jwt`)에서 `users` 테이블에 없는 신규 Google 로그인
  사용자는 자동 생성(Auth.js 어댑터 기본 동작).
- 커스텀 도메인 미확정이므로 `NEXTAUTH_URL`/`AUTH_URL`은 `APP_ORIGIN` 환경변수로 설정.

### 2. 프로필 CRUD

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/profile` | 로그인 사용자 본인 프로필 조회 |
| PUT | `/api/profile` | 본인 프로필 생성/갱신(upsert) |

- body(미확정, [[anyang-database-schema#profiles (미확정)]] 컬럼 기준): `{ birth_year, gender,
  occupation_type, residency }`. 프로필 추가 항목([[anyang-youth-policy-assistant#확인이
  필요한 항목]] 2번)이 정해지면 필드가 늘어난다.
- 인증 필요(세션 없으면 401). 본인 것만 접근(다른 user_id 조회 불가).

### 2-1. 추천 공지 피드·상세 (frontend 조율, 2026-09-27)

frontend가 채팅 밖에서 "나에게 맞는 공지 목록"과 개별 공지 상세를 보여줄 화면을 설계 중이라
아래 조회 엔드포인트를 제안한다(미확정).

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notices/recommended` | 로그인 사용자 프로필/선호 기준 추천 공지 목록(페이지네이션, 미확정) |
| GET | `/api/notices/:id` | 공지 상세 1건 |

- `/api/notices/recommended` 매칭 로직은 7절 `/api/jobs/notify`의 코사인 유사도 방식을
  재사용(제안, 미확정) — 프로필/선호 임베딩과 `notice_chunks` 유사도 상위 N건(N 미확정).
- 응답 필드(목록, 미확정): `{ id, title, excerpt, posted_at }`. `excerpt`는 본문 앞부분
  발췌(길이 미확정).
- 응답 필드(상세, 미확정): `{ id, title, body, source_url, posted_at }`. `source_url`은
  원문 링크 — `notices` 테이블 컬럼명은 [[anyang-database-schema]]를 따른다(컬럼명 확정은
  database 소관, 이 문서는 API 응답 키만 정의).
- 인증 필요(세션 없으면 401). 본인 프로필 기준 결과만 반환.

### 2-2. 알림 설정

`notify_settings`(notify_time, enabled) 조회·저장 엔드포인트(제안, 미확정).

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notify-settings` | 로그인 사용자 본인 알림 설정 조회 |
| PUT | `/api/notify-settings` | 본인 알림 설정 생성/갱신(upsert) |

- body(미확정): `{ notify_time, enabled }`. `notify_time` 형식은
  [[anyang-database-schema#notify_settings]] 컬럼 타입을 따른다(자유/고정 여부 미확정,
  확인 항목 3과 연결).
- 인증 필요(세션 없으면 401). 본인 것만 접근.

### 2-3. "AI가 기억하는 내 정보" (user_preferences) — 화면 채택 자체 미확정, 제안만

이 화면의 최종 포함 여부는 pm/사용자 확인 대기([[anyang-youth-policy-assistant#확인이
필요한 항목]]). 아래는 "화면이 채택되면 이런 형태"의 제안이며, 화면이 빠지면 이 절도 함께
빠진다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/preferences` | 로그인 사용자의 `user_preferences` 항목 목록(요약 문장 등) |
| DELETE | `/api/preferences/:id` | 항목 1건 삭제 |

- 수정(PUT/PATCH)은 제안하지 않는다 — `user_preferences`는 대화에서 추출된 요약이라
  사용자가 직접 편집하면 임베딩과 원문 문장이 어긋난다(미확정, 수정 필요 시 재검토).
- 인증 필요, 본인 것만 접근.

### 3. 채팅 — DeepSeek 스트리밍 + RAG

`POST /api/chat` (미확정) — body `{ conversation_id?, message }`. SSE/스트리밍 응답
(Vercel Fluid 함수의 스트리밍 응답 사용, 미확정).

**흐름 (제안, 미확정)**:

1. 사용자 메시지를 `messages`에 저장(role=user).
2. RAG 검색:
   a. `user_preferences.embedding`(누적 선호 벡터, 있으면)과 현재 메시지를 임베딩한 벡터를
      결합(예: 최근 선호 top-K 평균 + 현재 메시지 임베딩, 가중치 미확정)해 쿼리 벡터를 만든다.
   b. `notice_chunks`에서 코사인 유사도 상위 K건(K 미확정, 제안 5)을 pgvector HNSW로 검색.
   c. **프로필 조건 필터**: 현재 `notices`/`notice_chunks` 스키마에는 정형화된 대상 조건
      컬럼(연령·성별·직군 자격요건)이 없다 — 게시판 구조가 아직 확인되지 않아
      ([[anyang-youth-policy-assistant#확인이 필요한 항목]] 1번) 그런 컬럼을 설계에 넣을
      근거가 없다. 그래서 이 단계에서는 프로필 조건(나이대·성별·직군)을 DB 쿼리 필터가 아니라
      **DeepSeek 프롬프트의 컨텍스트 조건**으로만 전달해 "이 조건에 맞는 것만 우선 언급"하도록
      한다(제안, 미확정). 게시판 구조 확인 후 자격요건 파싱이 가능해지면 `notices`에 구조화
      컬럼 추가를 검토한다 — 이는 설계 변경이므로 그때 database와 재조율한다.
3. DeepSeek API 호출(OpenAI 호환 Chat Completions, `stream: true`, 미확정). 전송 메시지에는
   **식별정보 없이** 다음만 포함: 프로필 조건 텍스트(나이대·성별·직군), 검색된 공지 제목·본문
   일부, 최근 대화 맥락. `email`, `name`, `user_id`는 절대 포함하지 않는다
   ([[anyang-ai-models-data-transfer]] 준수).
4. 응답 스트리밍 중 청크를 클라이언트로 전달, 완료 후 `messages`에 저장(role=assistant).
5. **선호 추출(제안, 미확정)**: 대화 종료 또는 N턴마다(N 미확정) DeepSeek에 "이 대화에서
   드러난 선호를 문장으로 요약" 요청(식별정보 없이 대화 내용만 전송) → 결과 문장을 Gemini로
   임베딩해 `user_preferences`에 저장. 이 추출은 자유 텍스트 생성이라 Jev 대상이 아니다(문서·
   텍스트 생성은 dev-common Jev 조건에서 제외).

**외부 전송 데이터 최소화 요약**: DeepSeek에는 조건·공지 텍스트·대화 텍스트만, Gemini에는
공지 본문/선호 문장만. 둘 다 `user_id`, `email`, `name` 미전송(제약은 애플리케이션 코드가
지킨다 — database 문서에도 기록됨).

### 3-1. 대화 히스토리 조회 (frontend 조율, 2026-09-27)

frontend 질문: 대화 목록·과거 메시지 화면 포함 여부가 프로젝트 문서에 명시되어 있지 않다.
backend 판단만으로는 화면 스콥을 결정할 수 없어(미확정) — pm/사용자 확인이 필요한 항목으로
남긴다([[anyang-youth-policy-assistant#확인이 필요한 항목]]에 pm이 반영).

포함될 경우를 대비해 조회 엔드포인트 형태만 제안(미확정):

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/conversations` | 로그인 사용자의 대화 목록 |
| GET | `/api/conversations/:id/messages` | 특정 대화의 과거 메시지 목록 |

- `messages`/`conversations` 테이블 존재 여부와 컬럼은 [[anyang-database-schema]] 소관.
  현재 스키마 문서에 이 테이블들이 있는지는 database와 별도 확인 필요(미확정).

### 4. Gemini 임베딩 호출

- 모델 `gemini-embedding-001`, `output_dimensionality=768`(위 Context 참고, 미확정·재확인 대기).
- **무료 티어 요청 한도**: 확인 못 함(도구 접근 불가). 구현 전 https://ai.google.dev/gemini-api/docs/rate-limits
  (미확인 — 추정 URL 아님, 실제 접속해 확인 필요)에서 재확인.
- **재시도·배치(제안, 미확정)**: 429/5xx 응답 시 지수 백오프(예: 1s, 2s, 4s, 최대 3회 재시도,
  값 미확정). 임베딩 대상은 `notice_chunks.embedding IS NULL` / `user_preferences.embedding
  IS NULL`인 행을 큐로 보고, 배치 크기(한 번에 몇 건을 보낼지)는 한도 재확인 후 정한다
  (현재는 1건씩 순차 처리로 제안 — 한도를 몰라 배치 크기를 정할 근거가 없다).
- 모델 교체 절차는 [[anyang-database-schema#notice_chunks (미확정) — 벡터 검색용]]의
  재임베딩 절차를 따른다.

### 5. 공지 수집기 (Collector)

- 대상 게시판 URL: **미확정** — 사용자 제공 대기([[anyang-youth-policy-assistant#확인이
  필요한 항목]] 1번). 아래는 게시판 무관한 뼈대만 설계한다.
- 흐름(제안, 미확정):
  1. 게시판 도메인의 `robots.txt`를 먼저 가져와 파싱. 수집 대상 경로가 `Disallow`에 있으면
     수집하지 않고 로그만 남긴다(사용자에게 별도 보고).
  2. `robots.txt`의 `Crawl-delay`가 있으면 그 값을, 없으면 기본 요청 간격 2초(제안, 미확정)를
     요청 사이에 둔다.
  3. 목록 페이지 → 상세 페이지 순으로 HTML을 파싱(파서 라이브러리 미확정, 예:
     `cheerio` — 게시판 HTML 구조를 봐야 확정 가능).
  4. `content_hash`(제목+본문 해시, 미확정)로 기존 공지와 비교해 신규/변경분만 저장.
  5. 신규/변경 공지는 임베딩 파이프라인 큐에 등록(4번 참고).
- User-Agent에 연락 가능한 식별 문자열을 남긴다(제안, 미확정 — 예: 서비스명 + 문의 이메일).
- 게시판이 확정되면 이 절을 갱신(설계 변경 아님 — 애초에 미확정으로 남겨둔 자리를 채우는 것).

### 6. 임베딩 파이프라인

- 트리거: `POST /api/jobs/embed` (미확정) — 스케줄러(7번)가 호출.
- 동작: `notice_chunks`/`user_preferences` 중 `embedding IS NULL`인 행을 조회 → Gemini
  임베딩 호출(4번 재시도 규칙 적용) → 결과 저장.
- 청크 분할 여부: 미확정([[anyang-database-schema#notice_chunks (미확정) — 벡터 검색용]]
  참고). 공지 본문이 길면(임계값 미확정) 분할, 짧으면 통째로 1개 청크.

### 7. 스케줄러 — 수집 잡 / 알림 잡

이전 가능성 원칙에 따라 잡 로직은 앱 API 엔드포인트에, 트리거는 pg_cron+pg_net(클라우드)
또는 리눅스 cron+curl(UNO Q, 12절 runbook)로 교체 가능하게 둔다.

| 엔드포인트 | 설명 | 트리거 주기(미확정) |
|---|---|---|
| `POST /api/jobs/collect` | 공지 수집기(5절) 실행 | 미확정 — 게시판 갱신 주기를 몰라 확정 불가 |
| `POST /api/jobs/embed` | 임베딩 파이프라인(6절) 실행 | 미확정, 제안: 수집 잡 직후 |
| `POST /api/jobs/notify` | 알림 시각이 된 사용자에게 새 공지 매칭·푸시 | 미확정, [[anyang-database-schema]] 제안 5분 |

- **공유 시크릿 인증(제안, 미확정)**: 요청 헤더 `x-scheduler-secret`을 환경변수
  `SCHEDULER_SHARED_SECRET` 값과 상수 시간 비교(`crypto.timingSafeEqual`, 미확정 구현
  방식). 불일치 시 401. 값은 문서에 남기지 않는다(dev-common 규칙 9).
- `/api/jobs/notify` 매칭 로직(제안, 미확정): 활성 `notify_settings`가 있고 현재 시각이
  `notify_time`과 일치하는(또는 지난 5분 내, 잡 주기에 맞춰) 사용자마다, 최근 수집된
  미발송 공지 중 사용자 선호/프로필과의 코사인 유사도가 임계값(미확정, 제안 0.75) 이상인
  것만 골라 Web Push 전송(8절). **판정은 코사인 유사도 임계값(결정적 계산)만 쓰고 LLM을
  쓰지 않는다** — 반복 판단이지만 정규식/산술로 결정적으로 풀리므로 dev-common Jev 제외
  조건에 해당해 Jev 도입 대상이 아니다.
- Vercel Cron은 이전 가능성 원칙 3에 따라 쓰지 않는다.

### 8. Web Push (VAPID)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/push/subscribe` | 로그인 사용자의 구독 정보(`endpoint`, `p256dh`, `auth`) 저장 |
| DELETE | `/api/push/subscribe` | 구독 해지 |

- VAPID 키 쌍은 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` 환경변수, 클라우드·UNO Q 환경 간
  동일 값 유지([[anyang-deployment-portability#이전 가능성 원칙 (Vercel+Supabase ↔ UNO Q)]]
  원칙 5).
- VAPID subject는 `mailto:` 또는 `https://` + `APP_ORIGIN`(미확정 — 커스텀 도메인 확정 후).
- 라이브러리는 표준 `web-push`(npm, Node 표준 Web Push 구현) 사용 제안(미확정).

### 9. 환경변수 목록 (미확정)

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | PostgreSQL 접속(표준, 이전 가능성 원칙 1) |
| `AUTH_SECRET` | Auth.js JWT 서명 키 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `DEEPSEEK_API_KEY` | DeepSeek API |
| `GEMINI_API_KEY` | Gemini 임베딩 API |
| `SCHEDULER_SHARED_SECRET` | pg_net/cron → 앱 API 호출 인증 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |
| `APP_ORIGIN` | 커스텀 도메인 확정 전까지 배포 origin(OAuth 리다이렉트, VAPID subject, 푸시에 사용) |

### 10. Vercel 배포 설정

- 함수 리전: `icn1`(확정, [[anyang-deployment-portability]]).
- Next.js `output: 'standalone'`(확정, 이전 가능성 원칙 3 — Vercel 전용 기능 미사용).
- **함수 실행 시간 한도**: 확인 못 함(도구 접근 불가) — DeepSeek 스트리밍 응답이 길어질 경우
  Hobby 플랜의 함수 최대 실행 시간을 초과할 수 있어 구현 전 Vercel 공식 문서
  (https://vercel.com/docs/functions/limitations, 미확인 — 실제 접속해 재확인 필요)로
  재확인해야 한다.
- **Hobby Cron/비상업 조건**: [[anyang-deployment-portability]]에 "Hobby Cron 하루 1회
  제한", "Hobby는 비상업 전용"이 이미 결정 문서에 있다(출처 URL 없음 — 결정 시점 확인 경위는
  이 문서 범위 밖). 이 프로젝트는 Vercel Cron 자체를 쓰지 않으므로(7절, 이전 가능성 원칙 3)
  Cron 한도는 영향 없다. 비상업 조건은 [[anyang-youth-policy-assistant#확인이 필요한
  항목]] 5번(수익화 계획)과 연결 — 그대로 미해결.

### 11. 공식 문서 확인이 필요한 수치 목록 (재확인 대기)

| 항목 | 상태 | 비고 |
|---|---|---|
| Gemini 임베딩 무료 티어 요청 한도(RPM/TPM/RPD) | 확인 못 함(도구 접근 불가) | 4절 재시도·배치 크기에 영향 |
| DeepSeek API 요청 한도 | 확인 못 함(도구 접근 불가) | 채팅 동시 요청 처리량에 영향 |
| Vercel Hobby 함수 실행 시간 한도 | 확인 못 함(도구 접근 불가) | 채팅 스트리밍 응답 길이 제한에 영향 |
| `gemini-embedding-001` 모델명·`output_dimensionality` 파라미터 지원 여부 | 확인 못 함(도구 접근 불가) | 3-b, database 문서 `VECTOR(768)`의 근거 |

이 항목들은 구현 착수 전 웹 접근이 가능한 세션(사용자 또는 다른 도구 보유 에이전트)이
공식 문서로 재확인해야 한다. 미해결 질문에도 남긴다.

### 12. Runbook — Vercel+Supabase ↔ UNO Q 전환 절차 (제안, 미확정)

이전 가능성 원칙([[anyang-deployment-portability#이전 가능성 원칙 (Vercel+Supabase ↔ UNO
Q)]])에 따라 필수 포함. 목표: 전환 = DB 덤프/복원 + 환경변수 + DNS 변경.

**Vercel+Supabase → UNO Q**:

1. `pg_dump "$DATABASE_URL" -Fc -f backup.dump` (Supabase 운영 DB).
2. UNO Q에 `apt`로 PostgreSQL + pgvector 확장 설치, `CREATE EXTENSION vector;` 실행.
3. `pg_restore -d "$NEW_DATABASE_URL" backup.dump`.
4. 앱 빌드: `next build`(`output: 'standalone'`) → UNO Q에 산출물 복사 → Node.js
   standalone 서버를 `systemd` 유닛으로 등록해 상시 실행.
5. 환경변수(9절 표)를 UNO Q 쪽 `.env`(또는 systemd `EnvironmentFile`)로 이전. `DATABASE_URL`만
   새 값으로 교체, 나머지(특히 `VAPID_*`, `APP_ORIGIN`)는 동일 값 유지.
6. pg_cron/pg_net 잡을 리눅스 `cron` + `curl`로 교체(예: `*/5 * * * * curl -X POST
   -H "x-scheduler-secret: $SECRET" https://$APP_ORIGIN/api/jobs/notify`, 미확정 — 정확한
   crontab 표현식은 7절 주기 확정 후).
7. HTTPS: UNO Q는 가정용 회선이라 인증서·터널이 별도 필요(예: 리버스 프록시 + Let's
   Encrypt, 또는 Cloudflare Tunnel — 미확정, 이 문서 범위 밖 추가 조사 필요).
8. DNS `APP_ORIGIN` 도메인의 A/CNAME 레코드를 UNO Q 공인 IP(또는 터널 엔드포인트)로 변경.
9. 전환 후 Google OAuth 콘솔의 승인된 리다이렉트 URI가 `APP_ORIGIN` 기준이라 도메인이
   그대로면 변경 불필요(원칙 5 — 커스텀 도메인을 처음부터 사용하는 이유).

**UNO Q → Vercel+Supabase**: 역순(1은 UNO Q PostgreSQL에서 `pg_dump`, 3은 Supabase
`DATABASE_URL`로 `pg_restore`, 4는 `vercel deploy`, 6은 pg_cron+pg_net 잡 재등록).

**전제**: 두 환경 모두 표준 PostgreSQL+pgvector, Auth.js는 어댑터가 표준 PostgreSQL만
사용하므로 코드 변경 없이 이전 가능(Auth.js가 Supabase Auth 전용 기능을 쓰지 않기 때문).

## 테스트 방법

- **인증**: Google OAuth 로그인 성공 시 `users` 행 생성/재사용 확인. Credentials 가입 →
  `credentials.password_hash`가 평문이 아닌지 확인. 잘못된 비밀번호로 로그인 시 401.
- **프로필 CRUD**: 미인증 요청 401. 본인 프로필만 GET/PUT 가능(다른 user_id로 접근 시도해
  403/404 확인).
- **채팅**: DeepSeek API를 목(mock)으로 대체한 통합 테스트로 스트리밍 응답 조립 확인.
  전송 payload를 캡처해 `email`/`name`/`user_id` 문자열이 포함되지 않는지 검증(정규식 또는
  키 존재 여부 assert) — 데이터 최소화 원칙의 자동 검증.
- **RAG 검색**: 알려진 `notice_chunks` 픽스처와 쿼리 벡터로 코사인 유사도 상위 K가 예상
  순서로 나오는지 확인.
- **임베딩 파이프라인**: Gemini API를 목으로 대체, 429 응답 시 재시도 횟수·백오프 간격이
  설계대로 동작하는지 확인. `embedding IS NULL` 큐가 처리 후 빈 것을 확인.
- **수집기**: `robots.txt`에 `Disallow`가 있는 목 서버로 테스트해 수집을 건너뛰는지 확인.
  `content_hash` 중복 시 재저장하지 않는지 확인.
- **스케줄러 인증**: `x-scheduler-secret` 헤더 누락/불일치 시 401, 일치 시 200 확인.
- **알림 매칭**: 임계값 이상 유사도만 푸시 대상에 포함되는지 단위 테스트.
- **Web Push**: 구독 저장 후 목 `web-push` 라이브러리로 전송 호출 인자(endpoint, payload)
  검증.
- **Runbook**: 개발 환경에서 로컬 PostgreSQL로 실제 덤프/복원 1회 리허설(UNO Q 실기기
  테스트는 이 설계 범위 밖 — 구현 단계에서 별도 확인).

## 확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)

- 위 11절의 공식 문서 재확인 4건(Gemini 한도, DeepSeek 한도, Vercel Hobby 함수 시간 한도,
  `gemini-embedding-001`/`output_dimensionality` 지원 여부) — 웹 접근 도구가 있는 세션에서
  확인 필요.
- 수집 대상 게시판 구조 확인 후 5절 파서·자격요건 구조화 여부 재검토(현재는 프로필 조건을
  DB 필터가 아닌 프롬프트 컨텍스트로만 반영, 3절 참고) — 확인 항목 1과 연결.
- UNO Q 전환 시 HTTPS 확보 방법(리버스 프록시/터널, 12절 7번) — 이 설계 범위 밖 별도 조사 필요.
- (frontend 조율, 2026-09-27) 채팅 대화 히스토리 목록·조회 화면을 이번 스콥에 포함할지
  미확정 — 3-1절 `GET /api/conversations`, `GET /api/conversations/:id/messages` 제안은
  화면 채택 여부가 정해지면 확정한다.
- (frontend 조율, 2026-09-27) "AI가 기억하는 내 정보" 화면 채택 여부 미확정 — 2-3절
  `/api/preferences` 제안은 화면 채택 여부가 정해지면 확정한다.

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-database-schema]]
- [[anyang-stack-database]]
- [[anyang-ai-models-data-transfer]]
- [[anyang-login-method]]
- [[anyang-deployment-portability]]
- [[glossary]]
- [[anyang-backend-tasks]]
- [[anyang-frontend-screens]]
- [[anyang-frontend-tasks]]
