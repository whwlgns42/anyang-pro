---
type: design
date: 2026-09-27
status: draft
owner: frontend
---

# 안양 청년정책 비서 — Frontend 화면 설계

## Summary

Next.js(App Router) PWA, 모바일 우선. 로그인/가입 → 온보딩(프로필) → 채팅/추천 공지 피드를
중심으로, 알림 설정·"AI가 기억하는 내 정보"·대화 히스토리 목록 화면을 둔다(모두
[[anyang-service-scope]]로 채택 확정). API는 모두 [[anyang-backend-api]]를 근거로 삼는다.
화면 포함 여부는 확정됐고, 세부 구조·문구·레이아웃 값은 여전히 `(미확정)`이며 사용자 설계
승인으로 확정된다. 비밀번호 재설정 화면은 기능 자체가 미확정이라 이 문서에서 확정 설계하지
않는다.

## Context

- 확정: Next.js(App Router) 풀스택 PWA [[anyang-stack-database]], 로그인 Google+이메일/비밀번호
  [[anyang-login-method]], 외부 AI 식별정보 전송 금지 [[anyang-ai-models-data-transfer]],
  이전 가능성 원칙(Vercel 전용 기능 금지, `output: 'standalone'`)
  [[anyang-deployment-portability#이전 가능성 원칙 (Vercel+Supabase ↔ UNO Q)]].
- backend와 조율(2026-09-27, [[anyang-backend-api#2-1. 추천 공지 피드·상세 (frontend 조율, 2026-09-27)]],
  [[anyang-backend-api#2-2. 알림 설정 — 채택 (사용자별 자유 시각 + on/off)]], [[anyang-backend-api#2-3. "AI가 기억하는 내 정보" (user_preferences) — 채택 (조회·수정·삭제)]],
  [[anyang-backend-api#3-1. 대화 히스토리 조회 — 채택]], [[anyang-backend-api#1. 인증 (Auth.js v5)]]):
  - 추천 공지 목록/상세, 알림 설정·기억·히스토리 엔드포인트가 backend 문서에 반영됐다(엔드포인트
    형태는 여전히 제안·미확정이지만 화면 채택 자체는 확정, [[anyang-service-scope]], user,
    2026-09-27).
  - 가입 동의는 이메일 가입 시 `POST /api/auth/register`의 `consent: true`, Google 로그인 시
    신규 사용자에 한해 별도 `POST /api/auth/consent` 호출로 처리한다(backend 1절). 동의 전
    사용자는 다른 API가 403을 반환하므로, 프런트는 동의가 끝나기 전 온보딩·채팅 등으로
    진행시키지 않는다.
  - 도메인 변경 시 기존 Web Push 구독이 무효화되므로 재구독을 유도하는 UI가 필요하다
    ([[anyang-backend-api#12-1. 커스텀 도메인 연결 절차 (환경 전환 아님, 배포 origin만 교체) — 제안, 미확정]]).
  - 비밀번호 재설정은 기능 자체가 미확정이므로
    ([[anyang-backend-api#1-1. 이메일 인증·비밀번호 재설정 — verification_tokens 미사용에 따른 정리 (제안, 결정 필요)]])
    이 화면을 설계하지 않고 (미확정)으로만 표시한다.
- 프로필 코드값 셋(`gender`, `occupation_type`, `enrollment_status`)은
  [[anyang-database-schema#profiles (미확정 — 컬럼 타입·코드값은 설계 승인 전, 항목 범위는 확정)]]
  기준으로 여전히 미확정이다. 개인정보 동의 화면의 세부 문구·동의 항목 단일/분리 체크도
  미확정 — 사용자 확인 대기 중이다(아래 확인이 필요한 항목 참고).
- 커스텀 도메인은 나중에 붙는다(user, 2026-09-27). `APP_ORIGIN` 환경변수가 base URL의 유일한
  출처이며 코드에 도메인을 하드코딩하지 않는다. 도메인 변경 절차는
  [[anyang-backend-api#12-1. 커스텀 도메인 연결 절차 (환경 전환 아님, 배포 origin만 교체) — 제안, 미확정]]에 있다.

## Details

### 화면 목록 (포함 여부 확정, 세부는 미확정)

1. 로그인/가입
2. 개인정보 동의 (가입 시 필수, [[anyang-service-scope]] 확정)
3. 온보딩 (프로필 입력)
4. 채팅
5. 추천 공지 피드 · 상세
6. 알림 설정 (개인 설정)
7. "AI가 기억하는 내 정보"
8. 대화 히스토리 목록
9. 개인정보 처리방침 페이지 (정적)
10. 비밀번호 재설정 — 기능 자체 미확정, 화면 설계 보류

라우팅(App Router, 미확정 제안): `/login`, `/consent`, `/onboarding`, `/chat`, `/notices`,
`/notices/[id]`, `/settings/notifications`, `/settings/memory`, `/conversations`,
`/privacy-policy`. 비밀번호 재설정 라우팅은 기능 확정 전이라 두지 않는다.

### 공통 레이아웃 (모바일 우선, 미확정)

- 뷰포트 기준 360~430px 폭 우선 설계. 데스크톱은 같은 레이아웃을 중앙 정렬 고정폭(예: 480px,
  미확정)으로 확장만 한다 — 별도 데스크톱 전용 레이아웃을 만들지 않는다(YAGNI, 요청 범위 밖).
- 하단 탭 내비게이션(제안, 미확정): 채팅 / 공지 피드 / 설정. 로그인 전 화면(로그인·가입·온보딩)과
  개인정보 동의 화면에는 탭을 두지 않는다.
- 공통 인증 가드: 로그인하지 않은 사용자가 `/chat`, `/notices`, `/settings/*`에 접근하면
  `/login`으로 리다이렉트(제안, 미확정 — Auth.js 세션 확인 기준, [[anyang-backend-api#1. 인증 (Auth.js v5)]]).
- 온보딩 미완료(프로필 없음) 사용자가 `/chat` 등에 접근하면 `/onboarding`으로 리다이렉트
  (제안, 미확정 — `GET /api/profile` 404/빈 값 기준).

### 1. 로그인/가입 화면 (`/login`, 미확정)

- 구성 요소(미확정): "Google로 계속하기" 버튼(OAuth 리다이렉트), 이메일·비밀번호 입력 폼(로그인),
  "계정이 없다면 가입" 전환 링크 → 같은 화면에서 폼 모드만 전환(가입 시 비밀번호 확인 입력 추가,
  미확정).
- 가입 흐름(미확정): 이메일·비밀번호 입력 → 동의 체크박스(`/consent` 화면, 7절 참고)를 거쳐
  체크된 상태로 `POST /api/auth/register`({ email, password, consent: true },
  [[anyang-backend-api#1. 인증 (Auth.js v5)]]) 호출 → 성공 시 자동 로그인 후 `/onboarding`으로
  이동. `consent`가 체크되지 않으면 제출 버튼 비활성(제안, 미확정). 이메일 중복(409) 시 인라인
  오류 메시지.
- 로그인 흐름(미확정): Auth.js Credentials 로그인 → 성공 시 프로필 존재 여부에 따라 `/chat`
  또는 `/onboarding`. 401 시 "이메일 또는 비밀번호가 올바르지 않습니다"(미확정 문구).
- Google 로그인 흐름(미확정): Auth.js `signIn('google')` → 콜백 후 신규 사용자는 동의 여부를
  판별해(제안 — `GET /api/profile` 401 아닌 403 등 동의 필요 신호 기준, backend 1절 참고)
  미동의 상태면 `/consent`로 보내 체크박스 동의 후 `POST /api/auth/consent`(body 없음) 호출 →
  성공 시 `/onboarding`. 이미 동의한 기존 사용자는 프로필 존재 여부로 `/chat` 또는
  `/onboarding`.
- 비밀번호 재설정: 기능 자체가 미확정([[anyang-service-scope]], 사용자 확인 대기 — 아래
  확인이 필요한 항목 참고)이라 이 화면을 설계하지 않는다. 확정되면 별도로
  backend·frontend를 재조율해 설계를 추가한다.

### 2. 온보딩 — 프로필 입력 (`/onboarding`, 미확정)

- 항목: 4개로 **확정**([[anyang-service-scope]], user, 2026-09-27) — `birth_year`, `gender`,
  `occupation_type`, `enrollment_status`([[anyang-database-schema#profiles (미확정 — 컬럼
  타입·코드값은 설계 승인 전, 항목 범위는 확정)]]). 더 늘어나지 않는다.
- 입력 컴포넌트(미확정, 제안): `birth_year` — 네이티브 `<select>` 또는 `<input type="number">`
  (연도 범위, YAGNI — 커스텀 날짜 피커 불필요). `gender`, `occupation_type`,
  `enrollment_status` — 라디오 버튼 그룹(코드값 셋 미확정,
  [[anyang-database-schema#profiles (미확정 — 컬럼 타입·코드값은 설계 승인 전, 항목 범위는 확정)]]
  참고 — database가 코드값을 정할 때까지 화면 문구는 자리표시자로 둔다).
- 제출: `PUT /api/profile`([[anyang-backend-api#2. 프로필 CRUD]]) → 성공 시 `/chat` 이동.
- 모든 항목 null 허용(database 설계 원칙)이므로 "나중에 입력" 건너뛰기 버튼 포함(미확정,
  건너뛰면 빈 값으로 `PUT` 호출).

### 3. 채팅 화면 (`/chat`, 미확정)

- 구성: 메시지 리스트(사용자/AI 말풍선), 하단 입력창, 전송 버튼, 대화 히스토리 목록 진입점
  (`/conversations`, 8절)으로 가는 버튼/아이콘(제안, 미확정 — 위치는 상단 헤더). AI 응답 중
  관련 공지를 인용하면 말풍선 안에 카드 형태로 표시(제목 + "자세히 보기" 링크 →
  `/notices/[id]`, 미확정).
- 스트리밍: `POST /api/chat`([[anyang-backend-api#3. 채팅 — DeepSeek 스트리밍 + RAG]])의
  SSE/스트리밍 응답을 받아 AI 말풍선에 토큰 단위로 이어붙인다(제안, 미확정 — 스트리밍 전송
  방식 자체가 backend 문서에서도 미확정이라 클라이언트 파싱 방식은 backend 확정 후 재확인 필요).
- 대화 히스토리 목록 화면이 채택됐으므로([[anyang-service-scope]], user, 2026-09-27) `/chat`
  화면 진입 시에는 가장 최근 `conversation_id`를 이어서 쓰거나 새 대화를 시작하고(제안,
  미확정), 과거 대화를 다시 열려면 8절 목록 화면에서 선택해 들어온다
  ([[anyang-backend-api#3-1. 대화 히스토리 조회 — 채택]]).
- 관련 공지 인용 표시 방식(카드 vs 텍스트 링크, 몇 건까지)은 미확정.

### 4. 추천 공지 피드 · 상세 (`/notices`, `/notices/[id]`, 미확정)

- 피드: `GET /api/notices/recommended`([[anyang-backend-api#2-1. 추천 공지 피드·상세 (frontend 조율, 2026-09-27)]])
  응답 `{ id, title, excerpt, posted_at }` 목록을 카드 리스트로 표시. 페이지네이션 방식
  (무한 스크롤 vs 페이지 번호)은 미확정 — 1차 제안은 무한 스크롤(모바일 우선 관례, 미확정).
- 상세: `GET /api/notices/:id` 응답 `{ id, title, body, source_url, posted_at }`을 표시하고
  `source_url`은 새 탭(또는 외부 브라우저) 링크로 원문 이동. 앱 내 iframe 임베드는 하지
  않는다(원문 게시판이 임베드를 막을 수 있음 — YAGNI, 확인 안 된 것 추측 금지).

### 5. 알림 설정 (`/settings/notifications`, 미확정)

- 구성: on/off 토글(`enabled`), 알림 시각 자유 입력. 사용자별 자유 시각 설정으로
  **확정**됐으므로([[anyang-service-scope]], user, 2026-09-27) 고정 선택지(라디오/드롭다운)는
  더 이상 고려하지 않는다. 입력 컴포넌트는 네이티브 `<input type="time">` 제안(미확정 —
  YAGNI, 커스텀 타임피커 불필요). 저장 값은 `notify_time`(time)
  ([[anyang-database-schema#notify_settings (미확정 — 컬럼 타입은 설계 승인 전, 항목 범위·시간대는 확정)]]).
- 조회/저장: `GET/PUT /api/notify-settings`
  ([[anyang-backend-api#2-2. 알림 설정 — 채택 (사용자별 자유 시각 + on/off)]]).
- **PWA 푸시 권한 요청 흐름**(제안, 미확정): 이 화면에서 토글을 켜는 시점에 브라우저
  `Notification.requestPermission()` 요청 → 허용되면 서비스워커의 `PushManager.subscribe()`로
  구독 정보를 받아 `POST /api/push/subscribe`([[anyang-backend-api#8. Web Push (VAPID)]])
  호출. 거부되면 토글을 다시 꺼진 상태로 되돌리고 "브라우저 알림 권한이 필요합니다" 안내
  (미확정 문구). 토글을 끄면 `DELETE /api/push/subscribe` 호출(제안, 미확정 — 기기별 구독
  해지인지 계정 전체 알림 비활성인지는 `enabled` 플래그와 별개로 정리 필요, 미확정).
- **도메인 변경 시 재구독 유도**(제안, 미확정): origin이 바뀌면 기존 Web Push 구독이
  무효화되므로([[anyang-backend-api#12-1. 커스텀 도메인 연결 절차 (환경 전환 아님, 배포 origin만 교체) — 제안, 미확정]]),
  이 화면 진입 시 구독 상태를 확인해(제안 — 서비스워커 `PushManager.getSubscription()`이
  null인데 `enabled`가 true면 재구독 필요로 판단) 배너/알림으로 "알림을 다시 켜주세요" 안내
  후 재구독 흐름(위 권한 요청과 동일)을 다시 태운다.

### 6. "AI가 기억하는 내 정보" (`/settings/memory`)

- 채택 **확정**([[anyang-service-scope]], user, 2026-09-27) — 조회·수정·삭제.
- `GET /api/preferences`
  ([[anyang-backend-api#2-3. "AI가 기억하는 내 정보" (user_preferences) — 채택 (조회·수정·삭제)]])
  응답을 리스트로 표시(각 항목은 `preference_text` 요약 문장, 미확정 — 편집 가능한 텍스트
  필드로 표시). 각 항목에 수정·삭제 버튼(미확정 배치).
- 수정: 텍스트를 고쳐 `PUT /api/preferences/:id`({ preference_text }) 호출 → 서버가 동기로
  재임베딩 후 응답(backend 2-3절). 재임베딩 실패(5xx) 시 텍스트가 반영되지 않았다는 오류
  메시지 표시(미확정 문구), 화면 값은 이전 값으로 되돌린다(제안, 미확정).
- 삭제: `DELETE /api/preferences/:id` → 성공 시 목록에서 제거.
- 빈 목록일 때 안내 문구(미확정): "아직 대화에서 기억한 내용이 없어요."

### 7. 개인정보 동의 화면 (`/consent`)

- 가입 시(Google·이메일 모두) 필수 동의 화면으로 **확정**([[anyang-service-scope]], user,
  2026-09-27). 미동의 시 가입 불가.
- 배치: 이메일 가입은 가입 폼 제출 전(또는 같은 화면 내 체크박스, 미확정 — 1절 참고),
  Google 로그인은 신규 사용자의 최초 로그인 직후 온보딩 이전에 노출(1절 참고).
- 동의 내용(제안, 미확정 문구): 수집 항목(생년·성별·직군·재학/재직 여부)과 수집 목적,
  DeepSeek(중국 서버에서 대화 처리)·Gemini(임베딩, 무료 티어) 국외 이전 고지
  ([[anyang-ai-models-data-transfer]] 참고), 처리방침 페이지(`/privacy-policy`, 9절) 링크.
- 동의 항목을 단일 체크박스로 받을지, 수집·이용 동의 / 국외 이전 동의로 분리할지는
  **미확정** — database가 제기한 미해결 질문([[anyang-database-schema#확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)]])과
  같은 항목으로, 사용자 확인 대기 중이다(아래 확인이 필요한 항목 참고). 분리로 정해지면 이
  화면은 체크박스 그룹으로, 단일로 정해지면 체크박스 하나로 바뀐다(레이아웃 영향은 작다,
  제안).
- 체크(들) 완료 후 제출: 이메일 가입은 `POST /api/auth/register`의 `consent: true`로 함께
  전송, Google 로그인은 `POST /api/auth/consent`(body 없음) 호출 후 `/onboarding` 이동
  (1절 참고). 미동의 상태로 진행 시도하면 제출 버튼 비활성 또는 인라인 오류(미확정).
- 세부 법적 문구는 이 설계 범위 밖 — 법률 검토가 필요할 수 있어 추측하지 않는다.

### 8. 대화 히스토리 목록 (`/conversations`)

- 채택 **확정**([[anyang-service-scope]], user, 2026-09-27).
- `GET /api/conversations`([[anyang-backend-api#3-1. 대화 히스토리 조회 — 채택]]) 응답을
  `updated_at desc` 순 카드/리스트로 표시(각 항목 `title`, 마지막 갱신 시각). 항목 클릭 시
  `GET /api/conversations/:id/messages`로 과거 메시지를 불러와 `/chat`에서 이어서 연다
  (제안, 미확정 — 예: `/chat?conversation_id=...` 쿼리 또는 상태 전달 방식은 미확정).
- 새 대화 시작 버튼(제안, 미확정) — `/chat`으로 이동하며 `conversation_id` 없이 진입.
- 빈 목록일 때 안내 문구(미확정): "아직 대화 기록이 없어요."

### 9. 개인정보 처리방침 페이지 (`/privacy-policy`)

- 정적 콘텐츠 페이지(제안, 미확정) — 수집 항목·목적, DeepSeek·Gemini 국외 이전 고지, 보관·
  삭제 정책 등 실제 문구는 법률 검토 후 확정(이 설계 범위 밖). 로그인 여부와 무관하게
  접근 가능(제안, 미확정).
- 2절 동의 화면에서 이 페이지로 링크한다.

### PWA — manifest·서비스워커 (미확정)

- `app/manifest.ts`(Next.js App Router 표준 방식, 별도 라이브러리 불필요 — 이미 프레임워크
  기능): `name`, `short_name`, `icons`(192/512px, 미확정 — 디자인 자산 없음), `start_url: '/'`,
  `display: 'standalone'`, `theme_color`/`background_color`(미확정).
- 서비스워커: Web Push 수신·표시(`push` 이벤트 → `self.registration.showNotification`)와
  클릭 시 앱 포커스/열기(`notificationclick`)만 담당한다(제안, 미확정). 오프라인 캐싱
  전략(프리캐시 자산 목록 등)은 이번 요청 범위에 없다 — 요청되지 않은 오프라인 지원까지
  만들지 않는다(YAGNI). 필요해지면 별도 요청으로 재설계.
- 서비스워커 등록 위치(제안, 미확정): 루트 레이아웃 클라이언트 컴포넌트에서
  `navigator.serviceWorker.register('/sw.js')` 1회 호출. Vercel 전용 기능이 아니라 표준
  Web API만 사용 — 이전 가능성 원칙과 충돌 없음.
- VAPID 공개키는 서버 환경변수 `VAPID_PUBLIC_KEY`([[anyang-backend-api#9. 환경변수 목록 (미확정)]])를
  클라이언트에 안전하게 노출하는 방법(Next.js `NEXT_PUBLIC_` 환경변수 또는 API로 전달, 미확정)이
  필요 — 공개키는 비밀값이 아니므로 노출 자체는 문제 없다(제안).

## 테스트 방법

- **로그인/가입**: Google 로그인 목(mock) 콜백으로 신규/기존 사용자 리다이렉트 분기 확인.
  이메일 중복 가입 시 409 오류 메시지 노출 확인. 잘못된 비밀번호 로그인 시 오류 메시지 확인.
- **개인정보 동의**: 미체크 상태로 제출 시도 시 진행되지 않는지 확인(제출 버튼 비활성 또는
  오류). 체크 후 이메일 가입은 `POST /api/auth/register`에 `consent: true`가 담기는지,
  Google 신규 가입은 `POST /api/auth/consent` 호출 후 `/onboarding`으로 이동하는지 확인.
  처리방침 페이지 링크 이동 확인.
- **온보딩**: 필수 아님(null 허용) 항목을 비워도 제출 성공 확인. 제출 후 `/chat` 이동 확인.
- **채팅**: 스트리밍 응답이 토큰 단위로 화면에 이어붙는지 확인(목 SSE 스트림). 공지 인용
  카드 클릭 시 `/notices/[id]`로 이동하는지 확인.
- **추천 공지 피드·상세**: 목록 카드 클릭 → 상세 진입 확인. `source_url` 링크가 새 탭으로
  열리는지 확인(원문 링크 무결성).
- **알림 설정**: 토글 on 시 브라우저 알림 권한 요청 프롬프트가 뜨는지 확인(로컬 개발
  `localhost`는 HTTPS 예외로 Notification API 사용 가능 — 운영은 커스텀 도메인 HTTPS 필요).
  권한 거부 시 토글이 다시 꺼지는지 확인. 허용 시 `POST /api/push/subscribe` 호출 페이로드에
  `endpoint`/`p256dh`/`auth`가 담기는지 확인.
- **서비스워커**: 브라우저 개발자 도구 Application 탭에서 서비스워커가 `activated` 상태인지
  확인. 목 푸시 이벤트를 개발자 도구에서 수동 트리거해 알림이 표시되는지 확인.
- **PWA 설치**: 모바일 브라우저(Chrome/Safari) 또는 데스크톱 Chrome에서 "홈 화면에 추가"/설치
  프롬프트가 뜨는지 확인. manifest 유효성은 Chrome DevTools "Application → Manifest" 패널로
  오류 없는지 확인.
- **"AI가 기억하는 내 정보"**: 목록 표시, 수정 후 목록에 반영되는지(재임베딩 실패 시 값이
  되돌아가는지) 확인, 삭제 후 목록에서 사라지는지 확인. 빈 목록 안내 문구 확인.
- **대화 히스토리**: 목록이 `updated_at desc` 순으로 오는지 확인. 항목 클릭 시 과거 메시지가
  로드되며 `/chat`에서 이어지는지 확인. 새 대화 시작 버튼이 빈 대화로 진입하는지 확인.
- **도메인 변경 재구독 유도**: 구독이 없는데 `enabled=true`인 상태를 목으로 만들어 배너가
  뜨는지, 재구독 흐름이 다시 동작하는지 확인.
- **인증 가드**: 미로그인 상태로 `/chat`, `/notices`, `/settings/notifications` 직접 접근 시
  `/login`으로 리다이렉트되는지 확인. 프로필 없는 로그인 사용자가 `/chat` 접근 시
  `/onboarding`으로 리다이렉트되는지 확인. 동의하지 않은 사용자가 `/chat` 등에 접근 시
  `/consent`로 리다이렉트되는지 확인(제안, 미확정 — 403 응답 기준).

## 확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)

1. 개인정보 동의 화면(`/consent`)의 세부 문구와 동의 항목을 단일 체크로 받을지, 수집·이용 /
   국외 이전으로 분리할지 — database가 먼저 제기한 항목
   ([[anyang-database-schema#확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)]])과
   같다. 사용자 확인 대기 중 — 결정에 따라 7절 화면의 체크박스 구성이 바뀐다.
2. 비밀번호 재설정 기능을 이번 범위에 넣을지 — backend가 제기한 항목
   ([[anyang-backend-api#1-1. 이메일 인증·비밀번호 재설정 — verification_tokens 미사용에 따른 정리 (제안, 결정 필요)]])과
   같다. 사용자 확인 대기 중 — 넣기로 확정되면 별도 화면 설계가 필요하다(설계 변경).
3. 프로필 코드값 셋(`gender`, `occupation_type`, `enrollment_status`의 선택지) — database
   설계 승인 시 함께 확정될 예정([[anyang-database-schema#profiles (미확정 — 컬럼 타입·코드값은 설계 승인 전, 항목 범위는 확정)]]).
   확정 전까지 2절 화면은 자리표시자 라벨을 쓴다.

## Links

- [[anyang-backend-api]]
- [[anyang-database-schema]]
- [[anyang-youth-policy-assistant]]
- [[anyang-service-scope]]
- [[anyang-stack-database]]
- [[anyang-login-method]]
- [[anyang-ai-models-data-transfer]]
- [[anyang-deployment-portability]]
- [[glossary]]
- [[anyang-frontend-tasks]]
