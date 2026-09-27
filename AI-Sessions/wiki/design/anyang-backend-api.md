---
type: design
date: 2026-09-27
status: draft
owner: backend
---

# 안양 청년정책 비서 — Backend API 계약 설계

## Summary

Next.js(App Router) Route Handler로 인증(동의 게이트 포함), 프로필 CRUD, 알림 설정,
"AI가 기억하는 내 정보"(조회·수정·삭제), 대화 히스토리 조회, 채팅(DeepSeek 스트리밍 + RAG),
Gemini 임베딩, 공지 수집기(안양시 청년 게시판 1개), 임베딩 파이프라인, 스케줄러(수집·알림 잡),
Web Push를 제공한다. 스키마는 [[anyang-database-schema]]를 따른다. 이 문서의 엔드포인트·값은
모두 제안이며 `(미확정)`이고, 사용자 설계 승인으로 확정된다.

**공식 수치 반영 완료**: Gemini 임베딩 무료 티어 한도, DeepSeek API 요청 한도, Vercel Hobby
함수 실행 시간 한도, `gemini-embedding-001`/`output_dimensionality` 지원 여부는 2026-09-27
메인 세션이 웹 접근으로 공식 문서를 확인했다. 아래 각 절에 출처와 함께 반영했다(더 이상
"확인 못 함"이 아니다).

## Context

- 확정: 인증은 Google 소셜 + 이메일·비밀번호 [[anyang-login-method]]. AI는 대화 DeepSeek,
  임베딩 Gemini, 식별정보 전송 금지 [[anyang-ai-models-data-transfer]]. 배포 Vercel
  Hobby(icn1)+Supabase 무료, 이전 가능성 원칙 [[anyang-deployment-portability]].
- 확정([[anyang-service-scope]], user, 2026-09-27): 수집 대상 게시판 1개
  (https://www.anyang.go.kr/youth/selectBbsNttList.do?bbsNo=1184&key=3543), 프로필 4항목,
  알림 시각 자유 설정 + on/off, "AI가 기억하는 내 정보" 화면(조회·수정·삭제), 대화 히스토리
  목록 화면, 인증 부가 테이블(`verification_tokens`) 미사용, 가입 시 개인정보 필수 동의.
- database와 조율(2026-09-27, [[anyang-database-schema]]):
  - 인증 라이브러리: Auth.js(NextAuth) v5, Credentials(이메일·비밀번호) + Google OAuth
    provider 병행, JWT 세션 전략(DB sessions 테이블 미사용 — 이전 가능성 원칙에 맞게 세션을
    DB에 의존하지 않음).
  - 임베딩 모델·차원: `gemini-embedding-001`, `output_dimensionality=768`. 모델이
    1536/768차원 축소를 지원한다는 사실은 공식 문서로 확인됨(아래 4절 출처). database 문서의
    `notice_chunks.embedding` / `user_preferences.embedding`이 `VECTOR(768)`로 갱신됨.
- 이 세션(backend)에는 웹 접근 도구가 없어 수집 대상 게시판의 `robots.txt`와 실제 HTML 구조는
  이번 설계에서 확인하지 못했다 — **구현 전 확인(미확정)**으로 남긴다(5절).
- 커스텀 도메인은 배포 시점에 붙인다([[anyang-deployment-portability]] 원칙 5, user,
  2026-09-27 — 처음부터 커스텀 도메인을 쓰는 원안을 대체). `APP_ORIGIN` 환경변수가 base
  URL·OAuth 리다이렉트·VAPID subject의 유일한 출처이며 코드에 도메인을 하드코딩하지 않는다.
  도메인을 나중에 붙일 때의 절차는 12절에 짧게 둔다.

## Details

### 1. 인증 (Auth.js v5)

- 마운트: `app/api/auth/[...nextauth]/route.ts` (미확정 — Auth.js v5 App Router 컨벤션).
- Provider: `Google`(OAuth), `Credentials`(email/password).
- 세션 전략: `strategy: "jwt"`. DB에 세션 테이블을 두지 않는다.
- 비밀번호 해시: `argon2id`(제안, 미확정) — bcrypt보다 GPU 공격 저항이 높다. 파라미터
  (memory/time cost)는 미확정.
- 전용 엔드포인트(Auth.js가 커버하지 않는 것만):
  - `POST /api/auth/register` (미확정) — body `{ email, password, consent: true }`.
    `consent`가 true가 아니면 400으로 거부(가입 완료 불가, [[anyang-service-scope]] 확정).
    `consent`가 true면 트랜잭션으로 `users` + `credentials` 생성 후 `consents`에 1행
    기록(`policy_version`, `consented_at`). 이미 가입된 email이면 409.
- **Google 로그인 시 동의**: Auth.js 표준 콜백(`signIn`)에서 `users` 테이블에 없는 신규
  사용자면 로그인을 바로 완료시키지 않고, 프런트가 동의 화면을 먼저 보여준 뒤
  `POST /api/auth/consent`(미확정, body 없음, 세션 필요)를 호출해 `consents` 행을 남겨야
  가입이 완료된 것으로 처리한다(제안, 미확정) — Google OAuth 콜백 자체에서 동의를 막을 수
  없어 "가입 완료" 여부를 `consents` 존재 여부로 판단하는 방식. 동의 전 사용자는 로그인은
  되지만 다른 API가 403(동의 필요)을 반환한다(제안, 미확정 — 미들웨어에서 `consents` 존재
  확인).
- `consents.policy_version` 관리(제안, 미확정): 개인정보 처리방침 문구를 바꿀 때마다
  `POLICY_VERSION`을 날짜 문자열(예: `"2026-09-27"`)로 갱신하는 상수를 코드에 둔다. 버전이
  바뀌어도 기존 사용자에게 재동의를 강제하는 기능은 이번 스콥에 넣지 않는다(YAGNI — 방침이
  실제로 바뀌기 전까지 필요 없음). 방침 개정으로 재동의가 필요해지면 그때 설계를 추가한다.
- Auth.js 표준 콜백(`signIn`, `session`, `jwt`)에서 `users` 테이블에 없는 신규 Google 로그인
  사용자는 자동 생성(Auth.js 어댑터 기본 동작).
- 커스텀 도메인은 배포 시점에 붙이므로 `NEXTAUTH_URL`/`AUTH_URL`은 `APP_ORIGIN` 환경변수로
  설정한다(확정 원칙, [[anyang-deployment-portability]] 원칙 5).

### 1-1. 이메일 인증·비밀번호 재설정 — `verification_tokens` 미사용에 따른 정리 (제안, 결정 필요)

`verification_tokens`는 쓰지 않기로 확정됐다([[anyang-service-scope]], user, 2026-09-27).
이 테이블 없이 두 흐름을 어떻게 처리할지 정리한다.

- **이메일 인증(가입 확인 메일)**: 이번 스콥에서는 만들지 않는다(제안) — 서비스가 상업적
  피해 위험이 낮은 정책 알림 도구이고, 이메일 인증 없이도 실질적 피해가 적다고 판단. 이메일은
  가입 시 입력한 값을 검증 없이 신뢰한다(`users.email_verified`는 계속 null로 둔다).
- **비밀번호 재설정("비밀번호 찾기")**: 원래 계획서·서비스 범위 결정에 이 기능 자체가 명시돼
  있지 않다. `verification_tokens` 테이블 없이 만들려면 DB에 토큰을 저장하지 않는
  자체서명(stateless) 링크가 대안이다(제안, 미확정):
  1. `POST /api/auth/forgot-password` — body `{ email }`. 가입된 이메일이면
     `AUTH_SECRET`으로 서명한 토큰(이메일 + 만료시각(예: 30분)을 HMAC 서명, 미확정 라이브러리
     — 예: `jose`)을 담은 링크를 이메일로 전송. 미가입 이메일이어도 200(사용자 존재 여부
     노출 방지, 제안).
  2. `POST /api/auth/reset-password` — body `{ token, new_password }`. 서명·만료 검증 후
     `credentials.password_hash` 갱신. DB에 토큰을 저장하지 않으므로 재사용 방지(1회성
     보장)는 못 한다 — 만료시간을 짧게 두는 것으로 위험을 줄인다(제안, 한계 인지).
  3. 이메일 발송 수단(SMTP/서비스)은 미정 — 이 설계 범위 밖, 별도 확인 필요.
- **결정 필요**: 비밀번호 재설정 기능을 이번 스콥에 넣을지 자체가 계획서에 없던 항목이라
  backend 판단만으로 확정할 수 없다. pm/사용자 확인이 필요하다(미해결 질문 참고).

### 2. 프로필 CRUD

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/profile` | 로그인 사용자 본인 프로필 조회 |
| PUT | `/api/profile` | 본인 프로필 생성/갱신(upsert) |

- body(미확정, [[anyang-database-schema#profiles (미확정)]] 컬럼 기준): `{ birth_year, gender,
  occupation_type, enrollment_status }`. 4항목으로 확정됐다([[anyang-service-scope]], user,
  2026-09-27) — 더 늘어나지 않는다.
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

### 2-2. 알림 설정 — 채택 (사용자별 자유 시각 + on/off)

알림 설정 화면·API는 채택으로 확정됐다([[anyang-service-scope]], user, 2026-09-27).
`notify_settings`(notify_time, enabled, timezone=Asia/Seoul 고정,
[[anyang-database-schema#notify_settings (미확정 — 컬럼 타입은 설계 승인 전, 항목
범위·시간대는 확정)]]) 조회·저장 엔드포인트.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notify-settings` | 로그인 사용자 본인 알림 설정 조회 |
| PUT | `/api/notify-settings` | 본인 알림 설정 생성/갱신(upsert) |

- body(미확정 — 컬럼 타입 자체는 설계 승인 전): `{ notify_time, enabled }`. `notify_time`은
  하루 중 자유 시각(예: `"08:30"`)이며 고정 선택지 분기는 없다(확정). 서버는 `time` 형식
  검증만 한다(00:00~23:59).
- 인증 필요(세션 없으면 401). 본인 것만 접근.

### 2-3. "AI가 기억하는 내 정보" (user_preferences) — 채택 (조회·수정·삭제)

이 화면은 채택으로 확정됐다([[anyang-service-scope]], user, 2026-09-27). 조회·수정·삭제를
지원한다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/preferences` | 로그인 사용자의 `user_preferences` 항목 목록(요약 문장 등) |
| PUT | `/api/preferences/:id` | 항목 1건의 `preference_text` 수정 |
| DELETE | `/api/preferences/:id` | 항목 1건 삭제 |

- `PUT /api/preferences/:id` body(미확정): `{ preference_text }`. 서버가 **동기로**
  Gemini 재임베딩을 호출해 `embedding`/`embedding_model`/`updated_at`을 함께 갱신한 뒤
  응답한다([[anyang-database-schema#user_preferences (미확정) — 대화에서 추출한 선호,
  벡터. "AI가 기억하는 내 정보" 화면의 데이터]]의 "수정 시 재임베딩 필요" 절 반영). 재임베딩
  실패(4절 재시도 소진) 시 트랜잭션 롤백, 텍스트도 갱신하지 않고 5xx 응답(제안, 미확정) —
  텍스트와 임베딩이 어긋난 상태로 저장되면 검색 결과가 틀어지므로 둘을 한 트랜잭션으로 묶는다.
- 삭제는 행 DELETE로 충분(확정, [[anyang-service-scope]]).
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
   - **요청 한도**: DeepSeek는 RPM이 아니라 계정 단위 동시성 제한이다(`deepseek-flash` 2500,
     `deepseek-v4-pro` 500 동시 요청, 초과 시 429). 출처(2026-09-27 확인):
     https://api-docs.deepseek.com/quick_start/rate_limit/. API가 지원하는 `user_id`
     파라미터로 사용자별 동시성을 관리할 수 있으나, 식별정보 전송 금지 원칙에 따라 실제
     `user_id`/`email`이 아닌 **서버가 발급한 무작위 내부 ID**만 이 파라미터에 넣는다(제안,
     미확정 — 예: `crypto.randomUUID()`를 세션마다 생성해 재사용).
4. 응답 스트리밍 중 청크를 클라이언트로 전달, 완료 후 `messages`에 저장(role=assistant).
5. **선호 추출(제안, 미확정)**: 대화 종료 또는 N턴마다(N 미확정) DeepSeek에 "이 대화에서
   드러난 선호를 문장으로 요약" 요청(식별정보 없이 대화 내용만 전송) → 결과 문장을 Gemini로
   임베딩해 `user_preferences`에 저장. 이 추출은 자유 텍스트 생성이라 Jev 대상이 아니다(문서·
   텍스트 생성은 dev-common Jev 조건에서 제외).

**외부 전송 데이터 최소화 요약**: DeepSeek에는 조건·공지 텍스트·대화 텍스트만, Gemini에는
공지 본문/선호 문장만. 둘 다 `user_id`, `email`, `name` 미전송(제약은 애플리케이션 코드가
지킨다 — database 문서에도 기록됨).

### 3-1. 대화 히스토리 조회 — 채택

대화 히스토리 목록 화면은 채택으로 확정됐다([[anyang-service-scope]], user, 2026-09-27).

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/conversations` | 로그인 사용자의 대화 목록(제목, 마지막 갱신 시각) |
| GET | `/api/conversations/:id/messages` | 특정 대화의 과거 메시지 목록 |

- `messages`/`conversations` 테이블은 [[anyang-database-schema#conversations / messages
  (미확정)]]에 있다(컬럼: `conversations.id/user_id/title/created_at/updated_at`,
  `messages.id/conversation_id/role/content/created_at`). 목록은
  `(user_id, updated_at desc)` 인덱스로 최근 순 조회(database 문서 인덱스 제안).
- **`conversations.title` 자동 생성(제안, 미확정)**: 대화의 첫 사용자 메시지를 앞에서부터
  잘라(예: 30자, 미확정) 제목으로 저장한다. DeepSeek을 별도로 호출해 요약 제목을 생성하는
  방식은 이번 스콥에서 채택하지 않는다(YAGNI — 호출·비용·지연이 추가되는데 잘라내기로도
  목록 식별은 충분). 제목은 최초 생성 후 수정 API를 두지 않는다(제안, 미확정).
- 인증 필요, 본인 것만 접근.

### 4. Gemini 임베딩 호출

- 모델 `gemini-embedding-001`, `output_dimensionality=768`. 모델이 기본 3072차원이며
  `output_dimensionality`로 1536/768차원 축소를 지원함은 공식 문서로 확인됨(2026-09-27,
  https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings).
- **무료 티어 요청 한도**: 약 100 RPM / 30,000 TPM / 1,000 RPD, 결제 계정 불필요(2026-09-27
  확인, 출처: 위 문서 및
  https://discuss.ai.google.dev/t/gemini-embedding-free-tier-documentation/112553 — 두
  출처 간 수치 차이가 있어 아래 재시도·배치 전제를 유지한다).
- **재시도·배치(제안, 미확정)**: 무료 티어 RPD(1,000/일)가 낮아 배치 임베딩을 전제로 한다.
  429/5xx 응답 시 지수 백오프(예: 1s, 2s, 4s, 최대 3회 재시도, 값 미확정). 임베딩 대상은
  `notice_chunks.embedding IS NULL` / `user_preferences.embedding IS NULL`인 행을 큐로
  보고, 한 번의 `/api/jobs/embed` 호출에서 여러 건을 묶어 보낸다(배치 크기 미확정, 제안
  10~20건 — RPM 100 한도 안에서 여유를 두는 값).
- 모델 교체 절차는 [[anyang-database-schema#notice_chunks (미확정) — 벡터 검색용]]의
  재임베딩 절차를 따른다.

### 5. 공지 수집기 (Collector)

- 대상 게시판 URL: **확정** — 안양시 청년 게시판 1개
  (https://www.anyang.go.kr/youth/selectBbsNttList.do?bbsNo=1184&key=3543,
  [[anyang-service-scope]], user, 2026-09-27).
- **robots.txt 준수 확인 — 구현 전 확인(미확정)**: 이 설계 세션(backend)에는 웹 접근 도구가
  없어 `https://www.anyang.go.kr/robots.txt`와 실제 게시판 HTML 구조를 이번에 확인하지
  못했다. 구현 착수 전 반드시 확인한다 — 확인 방법(제안, 미확정): 구현 단계에서
  `curl https://www.anyang.go.kr/robots.txt`로 `Disallow`/`Crawl-delay`를 먼저 읽고,
  `/youth/selectBbsNttList.do` 경로가 `Disallow`에 걸리면 수집을 시작하지 않고 사용자에게
  보고한다(설계 변경 필요 사안이 된다).
- 흐름(제안, 미확정):
  1. 위 robots.txt 확인을 통과해야 수집을 실행한다(가드).
  2. `robots.txt`의 `Crawl-delay`가 있으면 그 값을, 없으면 기본 요청 간격 2초(제안, 미확정)를
     요청 사이에 둔다.
  3. 목록 페이지 → 상세 페이지 순으로 HTML을 파싱(파서 라이브러리 미확정, 예:
     `cheerio` — 게시판 HTML 구조 확인 후 셀렉터 확정, 구현 전 확인 항목).
  4. `content_hash`(제목+본문 해시, 미확정)로 기존 공지와 비교해 신규/변경분만 저장.
  5. 신규/변경 공지는 임베딩 파이프라인 큐에 등록(4번 참고).
- User-Agent에 연락 가능한 식별 문자열을 남긴다(제안, 미확정 — 예: 서비스명 + 문의 이메일).
- 게시판 HTML 구조(목록/상세 셀렉터, 페이지네이션 방식)는 구현 전 확인이 필요하다 — 확정된
  것은 URL과 robots.txt 준수·요청 간격 원칙뿐이다.

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
- **알림 시각 정밀도(제안, 미확정)** — pg_cron 트리거 주기 5분 전제
  ([[anyang-database-schema#pg_cron / pg_net 잡 정의 (미확정)]]): pg_cron은 지정한 크론
  표현식 그대로(예: `*/5 * * * *`) 정확히 실행되므로(Vercel Cron처럼 1시간 창 안 임의
  시점이 아니다), `/api/jobs/notify`는 "직전 실행 이후 지금까지" 창을 본다 — Asia/Seoul
  기준 `notify_time`이 `(현재 시각 - 5분, 현재 시각]` 범위에 들어오는 `enabled=true`
  사용자를 고른다(자정 경계는 날짜 넘김 처리 필요, 미확정 구현). 이렇게 하면 사용자가 어떤
  분을 고르든 늦어도 5분 안에 그 시각을 창이 지나간다.
  ```sql
  -- 제안(미확정): Asia/Seoul 기준 현재 시각의 5분 창 안에 notify_time이 있는 사용자
  select user_id
  from notify_settings
  where enabled = true
    and (now() at time zone timezone)::time
        between (notify_time) and (notify_time + interval '5 minutes')::time;
  ```
  - **중복 발송 방지(제안, 미확정)**: 위 창 기반 비교만으로는 잡이 재시도되거나 실행이
    겹치면 같은 사용자에게 하루 두 번 밀어줄 위험이 있다. 신규 컬럼 추가 대신, 매칭된
    공지 자체를 "이 사용자에게 이미 보낸 공지"로 표시(예: 발송 로그 또는
    `user_preferences`처럼 별도 테이블)해 두면 같은 공지를 두 번 보내지 않는다 — 이
    아이디어는 스키마 변경(새 테이블)이 필요할 수 있어 database와 후속 조율이 필요하다
    (미해결 질문 참고, 이번 세션은 합의가 필수적이지 않은 범위라 호출하지 않았다).
  - `timezone` 컬럼은 항상 `'Asia/Seoul'` 고정([[anyang-database-schema#notify_settings
    (미확정 — 컬럼 타입은 설계 승인 전, 항목 범위·시간대는 확정)]]).
- `/api/jobs/notify` 매칭 로직(제안, 미확정): 위 시각 창에 든 사용자마다, 최근 수집된
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
- VAPID subject는 `mailto:` 또는 `https://` + `APP_ORIGIN`(확정 원칙 — 값 자체는 도메인
  확정 시점에 정해짐, [[anyang-deployment-portability]] 원칙 5).
- 라이브러리는 표준 `web-push`(npm, Node 표준 Web Push 구현) 사용 제안(미확정).

### 9. 환경변수 목록 (미확정)

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | PostgreSQL 접속(표준, 이전 가능성 원칙 1) |
| `AUTH_SECRET` | Auth.js JWT 서명 키. 비밀번호 재설정 토큰 서명에도 재사용(1-1절, 제안) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `DEEPSEEK_API_KEY` | DeepSeek API |
| `GEMINI_API_KEY` | Gemini 임베딩 API |
| `SCHEDULER_SHARED_SECRET` | pg_net/cron → 앱 API 호출 인증 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |
| `APP_ORIGIN` | 배포 origin. 커스텀 도메인을 붙이기 전까지는 Vercel 기본 도메인, 붙인 뒤에는 그 도메인(OAuth 리다이렉트, VAPID subject, 푸시에 사용) |

### 10. Vercel 배포 설정

- 함수 리전: `icn1`(확정, [[anyang-deployment-portability]]).
- Next.js `output: 'standalone'`(확정, 이전 가능성 원칙 3 — Vercel 전용 기능 미사용).
- **함수 실행 시간 한도**: Fluid Compute 사용 시 함수 최대 300초(2026-09-27 확인, 출처:
  https://vercel.com/docs/functions/configuring-functions/duration). DeepSeek 스트리밍
  응답은 이 한도 안에서 끝나야 한다 — 300초를 넘길 만큼 긴 응답은 없다고 가정하되, 응답이
  느려질 경우를 대비해 타임아웃 처리(제안, 미확정)를 채팅 핸들러에 둔다.
- **Cron 정밀도**: Vercel Hobby Cron은 하루 1회, 지정 시각의 1시간 안 임의 시점에 실행된다
  (2026-09-27 확인, 출처: https://vercel.com/docs/cron-jobs/usage-and-pricing). 그래서
  이 부정확성을 피하려 알림 잡 트리거는 Vercel Cron이 아니라 Supabase `pg_cron`(정확한
  크론 표현식대로 실행)을 쓴다(확정, [[anyang-deployment-portability]], 7절).
- **Hobby 비상업 조건**: [[anyang-deployment-portability]]에 "Hobby는 비상업 전용"이 결정돼
  있고 수익화 계획 없음으로 확정됐다([[anyang-youth-policy-assistant#확인이 필요한 항목]]
  5번, 해결됨).

### 11. 공식 문서로 확인한 수치 (2026-09-27, 메인 세션 웹 확인)

| 항목 | 값 | 출처 |
|---|---|---|
| Gemini 임베딩 무료 티어 요청 한도 | 약 100 RPM / 30,000 TPM / 1,000 RPD | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings , https://discuss.ai.google.dev/t/gemini-embedding-free-tier-documentation/112553 |
| DeepSeek API 요청 한도 | RPM 아닌 계정 단위 동시성 제한(`deepseek-flash` 2500, `deepseek-v4-pro` 500), 초과 시 429 | https://api-docs.deepseek.com/quick_start/rate_limit/ |
| Vercel Hobby 함수 실행 시간 한도 | Fluid Compute 사용 시 최대 300초 | https://vercel.com/docs/functions/configuring-functions/duration |
| Vercel Hobby Cron 정밀도 | 하루 1회, 지정 시각의 1시간 안 임의 시점 | https://vercel.com/docs/cron-jobs/usage-and-pricing |
| `gemini-embedding-001` `output_dimensionality` 지원 | 기본 3072차원, 1536/768 축소 지원 | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings |

더 이상 "확인 못 함"인 항목은 없다. 남은 구현 전 확인 사항은 수집 대상 게시판의
`robots.txt`·HTML 구조뿐이다(5절).

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

### 12-1. 커스텀 도메인 연결 절차 (환경 전환 아님, 배포 origin만 교체) — 제안, 미확정

배포 환경(Vercel/UNO Q)은 그대로 두고 나중에 커스텀 도메인만 붙이는 경우의 짧은 절차
([[anyang-deployment-portability]] 원칙 5).

1. Vercel 프로젝트에 도메인 추가, DNS A/CNAME 레코드 설정.
2. `APP_ORIGIN` 환경변수를 새 도메인으로 갱신, 재배포.
3. Google OAuth 콘솔의 승인된 리다이렉트 URI에 새 도메인 기준 콜백 URL 추가(기존 URI는
   당분간 유지해 무중단 전환, 안정화 후 제거).
4. 웹 푸시는 origin(도메인)이 바뀌면 기존 구독이 무효화되므로, 클라이언트가 재구독하도록
   프런트에 안내(제안, 미확정 — 재구독 유도 UI는 frontend 소관).
5. `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`는 origin과 무관하게 동일 값 유지(재발급 불필요).

## 테스트 방법

- **인증·동의**: Google OAuth 로그인 성공 시 `users` 행 생성/재사용 확인. Credentials 가입 →
  `credentials.password_hash`가 평문이 아닌지 확인. 잘못된 비밀번호로 로그인 시 401.
  `consent: false`(또는 누락)로 회원가입 시도 시 400, `consents` 행이 생기지 않는지 확인.
  가입 성공 시 `consents` 행 1개가 생기는지 확인. 비밀번호 재설정(채택 시): 만료된 토큰으로
  `reset-password` 호출 시 거부되는지 확인.
- **프로필 CRUD**: 미인증 요청 401. 본인 프로필만 GET/PUT 가능(다른 user_id로 접근 시도해
  403/404 확인).
- **알림 설정**: 미인증 401. `notify_time` 형식이 아닌 값(예: `"25:00"`) PUT 시 400.
- **기억(user_preferences)**: `PUT /api/preferences/:id`로 텍스트 수정 시 `embedding`도
  함께 갱신되는지 확인(수정 전후 벡터 값이 달라짐). Gemini 목이 실패를 반환하면 텍스트도
  갱신되지 않는지(트랜잭션 롤백) 확인. `DELETE`로 삭제 후 `GET` 목록에 없는지 확인.
- **대화 히스토리**: `GET /api/conversations`가 `updated_at desc` 순으로 오는지 확인.
  새 대화 생성 시 `title`이 첫 메시지 앞부분으로 채워지는지 확인.
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

- 수집 대상 게시판(확정 URL)의 `robots.txt` 준수 확인과 실제 HTML 구조 확인 — 이 세션에는
  웹 접근 도구가 없어 구현 착수 전 확인이 필요하다(5절). `Disallow`에 걸리면 설계 변경이
  필요하다.
- 비밀번호 재설정("비밀번호 찾기") 기능 자체를 이번 스콥에 넣을지 — 계획서·서비스 범위
  결정에 없던 항목이라 backend 판단만으로 확정할 수 없다(1-1절). 넣는다면 이메일 발송
  수단도 별도로 정해야 한다.
- 알림 잡 중복 발송 방지를 위한 "사용자별 발송 이력" 저장 방식 — 새 테이블/컬럼이 필요할
  수 있어 database와 후속 조율이 필요하다(7절).
- 공지 자격요건을 `notices`의 구조화 컬럼으로 둘지 — 게시판 구조 확인 후 재검토(3절 c항,
  [[anyang-youth-policy-assistant#확인이 필요한 항목]] 9번과 연결).
- UNO Q 전환 시 HTTPS 확보 방법(리버스 프록시/터널, 12절 7번) — 이 설계 범위 밖 별도 조사 필요.
- `consents.policy_version` 관리 방식(날짜 문자열 제안)과 방침 개정 시 재동의 강제 여부는
  제안값이며 이번 스콥에서는 재동의 강제를 만들지 않는다(1절) — 필요해지면 재검토.
- 회원 탈퇴 시 `consents` 삭제/보존 여부, 동의 항목을 단일/분리로 받을지는 database가 이미
  제기한 미해결 질문([[anyang-database-schema#확인이 필요한 항목 (이 문서 관련, pm이
  프로젝트 문서에 반영)]])이며 backend API 설계는 그 결정에 맞춰 나중에 조정한다.

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-service-scope]]
- [[anyang-database-schema]]
- [[anyang-stack-database]]
- [[anyang-ai-models-data-transfer]]
- [[anyang-login-method]]
- [[anyang-deployment-portability]]
- [[glossary]]
- [[anyang-backend-tasks]]
- [[anyang-frontend-screens]]
- [[anyang-frontend-tasks]]
