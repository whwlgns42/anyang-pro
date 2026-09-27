---
type: design
date: 2026-09-27
status: active
owner: frontend
---

# 안양 청년정책 비서 — Frontend 화면 설계

## Summary

Next.js(App Router) PWA, 모바일 우선. 로그인/가입 → 온보딩(프로필) → 채팅/추천 공지 피드를
중심으로, 알림 설정·"AI가 기억하는 내 정보"·대화 히스토리 목록 화면을 둔다(모두
[[anyang-service-scope]]로 채택 확정). API는 모두 [[anyang-backend-api]]를 근거로 삼는다.
화면 포함 여부는 확정됐고, 세부 구조·문구·레이아웃 값은 여전히 ``이며 사용자 설계
승인으로 확정된다. 비밀번호 재설정 화면은 1차 출시에서 제외로 **확정**됐다
([[anyang-service-scope]], user, 2026-09-27) — 별도 화면을 만들지 않고, 로그인 화면에
"비밀번호를 잊었다면 Google로 로그인" 안내로 대체한다(1절). `/admin` 관리자 화면 4종(공지
수집 관리·알림 발송 현황·사용자 관리·통계·외부 API 사용량)도 채택 확정
([[anyang-service-scope]], user, 2026-09-27)이며, 세부는 이 문서의 10~13절에서 다룬다.
계정 탈퇴 화면(`/settings/account`, 8-1절)도 이번 반영으로 추가됐다.

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
  - 가입 동의는 "수집·이용"(`collection_use`)과 "국외 이전"(`overseas_transfer`) 체크박스
    2개로 분리해 각각 받는 것으로 **확정**됐다([[anyang-service-scope]], user, 2026-09-27).
    이메일 가입 시 `POST /api/auth/register`의
    `consents: { collection_use: true, overseas_transfer: true }`, Google 로그인 시 신규
    사용자에 한해 별도 `POST /api/auth/consent`(같은 `consents` body)로 처리한다(backend 1절).
    둘 다 체크해야 제출 가능하다. 동의 전 사용자는 다른 API가 403을 반환하므로, 프런트는
    동의가 끝나기 전 온보딩·채팅 등으로 진행시키지 않는다.
  - **처리방침 개정 시 재동의 강제**로 **확정**됐다([[anyang-service-scope]], user,
    2026-09-27). 인증 필요 API가 재동의 필요 403(backend 1절 "재동의 판정 위치")을 돌려주면
    공통 인증 가드가 이를 감지해 `/consent` 화면(7절, 재사용)으로 보내고, 두 체크박스를 다시
    체크해 `POST /api/auth/consent`를 재호출한다.
  - 도메인 변경 시 기존 Web Push 구독이 무효화되므로 재구독을 유도하는 UI가 필요하다
    ([[anyang-backend-api#12-1. 커스텀 도메인 연결 절차 (환경 전환 아님, 배포 origin만 교체) — 제안, 미확정]]).
  - 비밀번호 재설정은 1차 출시 제외로 **확정**됐다
    ([[anyang-backend-api#1-1. 이메일 인증·비밀번호 재설정 — verification_tokens 미사용에 따른 정리 (확정)]]).
    별도 화면·엔드포인트를 만들지 않고, 로그인 화면(1절)에 Google 로그인 안내 문구로
    대체한다.
  - 계정 탈퇴는 `DELETE /api/account`([[anyang-backend-api#1-3. 사용자 탈퇴 API (제안, 미확정)]])로
    처리하고, 탈퇴해도 동의 기록은 증빙용으로 1년간 보관된 뒤 삭제된다는 원칙(보관 기간
    **확정**, [[anyang-service-scope]], user, 2026-09-27,
    [[anyang-database-schema#consents — 가입 시 개인정보 필수 동의 기록]] 참고)에
    따라 8-1절 화면을 둔다.
- 프로필 코드값 셋(`gender`, `occupation_type`, `enrollment_status`)은 [[anyang-service-scope]]
  "프로필 선택지" 행(user, 2026-09-27)에서 확정됐다. 값 목록은 그 결정 문서를 원본으로 삼고
  여기서는 옮겨 적지 않는다. 개인정보 동의 화면의 세부 문구는 법률 검토 후 확정된다(9절 참고).
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
8-1. 계정 탈퇴 (`/settings/account`, 신규 반영)
9. 개인정보 처리방침 페이지 (정적)
10. 비밀번호 재설정 — 1차 출시 제외로 **확정**([[anyang-service-scope]], user, 2026-09-27).
    화면을 만들지 않는다. 로그인 화면(1절)에 안내 문구로 대체.
11. 관리자 — 공지 수집 관리 (`/admin/collect-runs`, 채택 확정)
12. 관리자 — 알림 발송 현황 (`/admin/notify-logs`, 채택 확정)
13. 관리자 — 사용자 관리·통계 (`/admin/users`, 채택 확정)
14. 관리자 — 외부 API 사용량 (`/admin/api-usage`, 채택 확정)

라우팅(App Router, 미확정 제안): `/login`, `/consent`, `/onboarding`, `/chat`, `/notices`,
`/notices/[id]`, `/settings/notifications`, `/settings/memory`, `/settings/account`,
`/conversations`, `/privacy-policy`. 비밀번호 재설정 라우팅은 기능 자체가 제외로 확정됐으므로
두지 않는다. 관리자 화면은 `/admin`을 공통 레이아웃(11~14절 하위 탭)으로 두고
`/admin/collect-runs`, `/admin/notify-logs`, `/admin/users`, `/admin/api-usage`로
나눈다(미확정 제안).

### 공통 레이아웃 (모바일 우선, 미확정)

- 뷰포트 기준 360~430px 폭 우선 설계. 데스크톱은 같은 레이아웃을 중앙 정렬 고정폭(예: 480px,
  미확정)으로 확장만 한다 — 별도 데스크톱 전용 레이아웃을 만들지 않는다(YAGNI, 요청 범위 밖).
- 하단 탭 내비게이션(제안, 미확정): 채팅 / 공지 피드 / 설정. 로그인 전 화면(로그인·가입·온보딩)과
  개인정보 동의 화면에는 탭을 두지 않는다.
- 공통 인증 가드: 로그인하지 않은 사용자가 `/chat`, `/notices`, `/settings/*`에 접근하면
  `/login`으로 리다이렉트(제안, 미확정 — Auth.js 세션 확인 기준, [[anyang-backend-api#1. 인증 (Auth.js v5)]]).
- 온보딩 미완료(프로필 없음) 사용자가 `/chat` 등에 접근하면 `/onboarding`으로 리다이렉트
  (제안, 미확정 — `GET /api/profile` 404/빈 값 기준).
- **403 응답 분기 (제안, 미확정 — 분기 자체는 backend
  [[anyang-backend-api#1-4. 403 응답 에러 코드 (제안, 미확정)]]의 에러 코드 존재를 전제)**:
  인증 필요 API가 403을 반환하면 공통 인증 가드가 응답 body의 `error` 코드로 아래처럼
  분기한다.
  - `ACCOUNT_SUSPENDED` (backend [[anyang-backend-api#1-2. 정지 계정 제한 방식]]) →
    정지는 로그인 자체를 막지 않는다. 로그인은 항상 허용되고, 로그인 성공 시 세션에 담기는
    `session.suspended`(boolean, backend 제안) 플래그가 true면 로그인 직후 정지 안내
    화면(1절)으로 보낸다(세션은 유지, 로그아웃하지 않는다). 정지 안내 화면에서 가능한 동작은
    로그아웃과 탈퇴(8-1절, `DELETE /api/account`)뿐이고, 그 외 화면·API 접근은 서버가 매
    요청 403 + `ACCOUNT_SUSPENDED`로 거부하므로, 공통 인증 가드가 이 응답을 받으면 현재
    화면 대신 정지 안내 화면으로 다시 보낸다(세션 종료 없음, 제안, 미확정).
  - `CONSENT_REQUIRED` (재동의 강제, **확정 원칙**, [[anyang-service-scope]], user,
    2026-09-27) → 현재 화면 대신 `/consent`로 리다이렉트한다. `/consent` 화면에서 두
    체크박스를 다시 체크해 `POST /api/auth/consent`를 재호출하면 원래 가려던 화면(또는
    `/chat`, 미확정 — 복귀 경로 저장 여부는 YAGNI로 우선 `/chat` 고정 제안)으로 이동한다.
    `/consent` 화면에도 탈퇴 경로(8-1절)를 함께 제공한다 — `DELETE /api/account`는 재동의
    필요 상태에서도 호출 가능하다(backend 1절 예외).
  - `ADMIN_ONLY` → `/admin/*` 전용(아래 "관리자 가드" 참고), 관리자가 아니라는 안내 후
    `/chat`으로 보낸다.
  - `ADMIN_EMAIL_RESERVED`는 이 공통 가드가 아니라 1절 가입 화면에서만 인라인 오류로
    처리한다(가입 시도 응답이라 리다이렉트 대상이 없음).
- **관리자 가드 (확정 원칙, [[anyang-service-scope]], user, 2026-09-27)**: 관리자 판정은
  서버만 한다. `ADMIN_EMAILS` 목록은 서버 환경변수([[anyang-backend-api#13-0. 공통 인가]])
  로만 존재하며, 클라이언트 코드·번들·정적 자산 어디에도 이메일 목록을 넣지 않는다(임포트,
  `NEXT_PUBLIC_` 환경변수, 빌드 타임 상수 모두 금지). 관리자 판정은 **이번 세션의 로그인을
  Google로 한 경우에만** 통과한다(backend 13-0절 — JWT의 `provider` 클레임 기준, 계정
  자체가 아니라 "지금 이 요청이 어떻게 인증됐는가"로 판정) — 같은 이메일이 과거 Google로
  가입했더라도 이번 세션을 이메일·비밀번호(Credentials)로 로그인했다면 `ADMIN_EMAILS`에
  있어도 관리자가 될 수 없다. `/admin/*` 화면은 진입 시 13-0절
  대상 아무 관리자 API나 1회 호출해 401이면 `/login`으로, 403(`ADMIN_ONLY`)이면 "관리자
  계정이 아닙니다" 안내와 함께 `/chat`으로 리다이렉트하고, 200이면 화면을 그린다(제안,
  미확정 — 클라이언트 쪽 "관리자인지" 캐시나 별도 `/api/admin/me` 없이 실제 데이터 API
  응답 코드로만 판단, YAGNI). 화면 자체의 존재나 링크는 숨기지 않아도 되지만(13-0절 403
  채택 원칙과 동일), 데이터는 서버 응답 없이는 절대 렌더링하지 않는다.

### 1. 로그인/가입 화면 (`/login`, 미확정)

- 구성 요소: "Google로 계속하기" 버튼(OAuth 리다이렉트), 이메일·비밀번호 입력 폼(로그인),
  "계정이 없다면 가입" 전환 링크 → 같은 화면에서 폼 모드만 전환(가입 시 비밀번호 확인 입력 추가,
  미확정). 비밀번호 입력 아래에 "비밀번호를 잊었다면 Google로 로그인" 안내 문구(제안, 미확정
  문구)를 둔다 — 별도 비밀번호 재설정 화면·링크는 만들지 않는다(1차 출시 제외 확정,
  [[anyang-backend-api#1-1. 이메일 인증·비밀번호 재설정 — verification_tokens 미사용에 따른 정리 (확정)]]).
  Credentials 가입 계정은 비밀번호를 잊으면 이 서비스 안에서 복구 수단이 없다는 한계가 있다
  (backend 1-1절).
- 가입 흐름: 이메일·비밀번호 입력 → 동의 체크박스(`/consent` 화면, 7절 참고)를 거쳐
  체크된 상태로 `POST /api/auth/register`(body 형식은 backend
  [[anyang-backend-api#1. 인증 (Auth.js v5)]]의 `{ email, password, consents: {
  collection_use, overseas_transfer } }`를 그대로 따른다 — 값은 여기서 복제하지 않는다) 호출
  → 성공 시 자동 로그인 후 `/onboarding`으로 이동. 두 체크박스가 모두 체크되지 않으면 제출
  버튼 비활성(제안, 미확정). 이메일 중복(409) 시 인라인 오류 메시지. 403 +
  `{ error: "ADMIN_EMAIL_RESERVED" }`([[anyang-backend-api#1-4. 403 응답 에러 코드 (제안, 미확정)]],
  관리자 이메일로 비밀번호 가입을 시도한 경우) 시에도 인라인 오류로 "이 이메일은 비밀번호로
  가입할 수 없습니다. Google로 로그인해 주세요"(제안, 미확정 문구)를 표시한다.
- 로그인 흐름: Auth.js Credentials 로그인 → 성공 시 프로필 존재 여부에 따라 `/chat`
  또는 `/onboarding`. 401 시 "이메일 또는 비밀번호가 올바르지 않습니다"(미확정 문구).
- **정지된 계정 로그인**(제안, 미확정 문구 — [[anyang-backend-api#1-2. 정지 계정 제한 방식]]
  기준, 에러 코드는 [[anyang-backend-api#1-4. 403 응답 에러 코드 (제안, 미확정)]]의
  `ACCOUNT_SUSPENDED`): **로그인 자체는 정지 여부와 무관하게 허용된다**(이전 "로그인 시점
  차단" 제안은 폐기). 이메일·비밀번호, Google 로그인 모두 정상적으로 성공하고, 세션에 담긴
  `session.suspended`가 true면 로그인 직후 정지 안내 화면(공통 레이아웃 절 참고)으로
  이동시켜 "이용이 정지된 계정입니다"(미확정 문구)를 보여준다. 정지 안내 화면에서 가능한
  동작은 로그아웃과 탈퇴(`/settings/account`, 8-1절)뿐이며, 그 외 화면 이동이나 API 호출은
  서버가 매 요청 403 + `ACCOUNT_SUSPENDED`로 거부하므로 공통 인증 가드가 이를 감지해 정지
  안내 화면으로 돌려보낸다(세션은 종료하지 않는다, 제안, 미확정). 정지 안내 화면에는 항상
  탈퇴 경로(8-1절) 링크를 함께 제공한다 — `DELETE /api/account`는 정지 상태에서도 호출
  가능하다(backend 1-2절 예외).
- Google 로그인 흐름: Auth.js `signIn('google')` → 콜백 후 신규 사용자는 동의 여부를
  판별해(제안 — `GET /api/profile` 401 아닌 403 등 동의 필요 신호 기준, backend 1절 참고)
  미동의 상태면 `/consent`로 보내 체크박스 동의 후 `POST /api/auth/consent`(body는 이메일
  가입과 같은 `{ consents: { collection_use, overseas_transfer } }`, backend 1절) 호출 →
  성공 시 `/onboarding`. 이미 동의한 기존 사용자는 프로필 존재 여부로 `/chat` 또는
  `/onboarding`.
- **`OAuthAccountNotLinked` 오류**(제안, 미확정 문구 — [[anyang-backend-api#1-5. 이메일 계정 연결 정책 (신규, 제안, 미확정)]]
  기준): 같은 이메일로 이미 이메일·비밀번호 계정이 있으면 Google 로그인이 Auth.js
  `OAuthAccountNotLinked` 에러로 실패한다(계정 자동 연결을 켜지 않는 것이 채택된 기본값이라
  발생하는 정상 동작). 이 오류를 비밀번호 오류와 구분해 안내한다: "이 이메일은 이미
  비밀번호로 가입되어 있습니다. 비밀번호로 로그인하거나, 본인 계정이 아니면 관리자에게
  문의해 주세요"(backend 1-5절 문구 그대로).
- 비밀번호 재설정: 1차 출시 제외로 **확정**됐다([[anyang-service-scope]], user, 2026-09-27).
  이 화면·엔드포인트·이메일 발송 수단을 만들지 않는다(위 구성 요소 항목의 안내 문구로 대체).

### 2. 온보딩 — 프로필 입력 (`/onboarding`, 미확정)

- 항목: 4개로 **확정**([[anyang-service-scope]], user, 2026-09-27) — `birth_year`, `gender`,
  `occupation_type`, `enrollment_status`([[anyang-database-schema#profiles (미확정 — 컬럼
  타입은 설계 승인 전, 항목 범위와 코드값 셋은 확정)]]). 더 늘어나지 않는다.
- 입력 컴포넌트(미확정, 제안): `birth_year` — 네이티브 `<select>` 또는 `<input type="number">`
  (연도 범위, YAGNI — 커스텀 날짜 피커 불필요). `gender`, `enrollment_status` — 라디오 버튼
  그룹. 표시 문구는 [[anyang-service-scope]] "프로필 선택지" 행의 한국어 표시명을 그대로 쓴다.
  `occupation_type`은 선택지가 8개로 다른 두 항목보다 많아 라디오 그룹 대신 네이티브
  `<select>`를 쓰는 제안(미확정 — 여덟 개 라디오 버튼이 모바일 화면에서 세로로 길어지는 것을
  피하기 위함, 설계 승인으로 확정). 표시 문구는 마찬가지로 [[anyang-service-scope]]의 한국어
  표시명을 쓴다.
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
- **선호가 없는 신규 사용자**(제안, 미확정 — backend 2-1절 제안 그대로 반영): 대화 이력이
  없어 `user_preferences`가 비어 있으면 서버가 유사도 계산 대신 최신 공지 순으로 응답한다.
  화면은 이 경우도 같은 카드 리스트로 그대로 표시하되, 목록 상단에 "아직 대화 기록이 없어
  최신 공지 순으로 보여드려요"(미확정 문구) 같은 빈 상태 안내를 덧붙인다(제안 — 서버 응답이
  추천인지 최신순 대체인지 구분하는 별도 필드는 이번 스콥에 없으므로, `user_preferences`
  존재 여부는 [[anyang-backend-api#2-3. "AI가 기억하는 내 정보" (user_preferences) — 채택 (조회·수정·삭제)]]
  응답이 빈 배열인지로 프런트가 판단한다, 미확정).
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
- **알림 대상 범위 안내**(제안, 미확정 문구 — backend `enabled_at` 반영,
  [[anyang-backend-api#2-2. 알림 설정 — 채택 (사용자별 자유 시각 + on/off)]]): 알림을 켠
  시각(`enabled_at`) 이후 수집된 공지만 알림 대상이 된다. 화면에 "알림을 켠 시점 이후에
  올라온 공지부터 알려드려요"(제안, 미확정 문구) 같은 안내를 토글 근처에 덧붙인다 — 토글을
  껐다가 다시 켜면 그 시점부터 다시 계산된다는 점도 같은 문구로 함께 전달한다(제안).
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
- 빈 목록일 때 안내 문구: "아직 대화에서 기억한 내용이 없어요."

### 7. 개인정보 동의 화면 (`/consent`)

- 가입 시(Google·이메일 모두) 필수 동의 화면으로 **확정**([[anyang-service-scope]], user,
  2026-09-27). 미동의 시 가입 불가. 처리방침 개정에 따른 재동의(아래) 때도 같은 화면을
  재사용한다.
- 배치: 이메일 가입은 가입 폼 제출 전(또는 같은 화면 내 체크박스, 미확정 — 1절 참고),
  Google 로그인은 신규 사용자의 최초 로그인 직후 온보딩 이전에 노출(1절 참고). 재동의 진입은
  공통 인증 가드가 `CONSENT_REQUIRED` 403을 감지해 이 화면으로 리다이렉트한다(공통 레이아웃
  절 참고). **재동의 화면 진입 시(가입 최초 동의가 아닌 경우)에는 탈퇴 경로(8-1절)로 가는
  링크도 함께 보여준다** — `DELETE /api/account`는 재동의 필요 상태에서도 호출 가능하다
  (backend 1절 예외, 재동의하지 않으려는 사용자에게 탈퇴 외 선택지가 막히지 않게 하기 위함).
- 동의 항목은 체크박스 **2개로 분리해 각각 필수**로 받는 것으로 **확정**됐다
  ([[anyang-service-scope]], user, 2026-09-27, backend
  [[anyang-backend-api#1. 인증 (Auth.js v5)]]):
  1. "수집·이용" 동의(`collection_use`) — 수집 항목(생년·성별·직군·재학/재직 여부)과 수집
     목적 고지.
  2. "국외 이전" 동의(`overseas_transfer`) — DeepSeek(중국 서버에서 대화 처리)·Gemini(임베딩,
     무료 티어) 국외 이전 고지, Gemini로 대화 내용을 전송한다는 사실(채팅 RAG 검색을 위한
     사용자 메시지 임베딩, 전송 전 전화번호·이메일·주민등록번호 형태는 정규식으로 가린 뒤
     전송)도 포함([[anyang-ai-models-data-transfer]], user, 2026-09-27 — 공지 본문·선호
     문장만 보내던 원안을 넓힘).
  두 체크박스 모두 체크해야 제출 가능(하나만 체크 시 제출 불가, 제안 — 버튼 비활성 또는
  인라인 오류, 미확정). 처리방침 페이지(`/privacy-policy`, 9절) 링크를 함께 둔다.
- 제출 body(확정 형식, backend 1절): `{ consents: { collection_use: true,
  overseas_transfer: true } }`. 이메일 가입은 `POST /api/auth/register`의 `consents` 필드로
  함께 전송, Google 로그인·재동의는 `POST /api/auth/consent`(같은 `consents` body) 호출 →
  성공 시 신규 가입은 `/onboarding`, 재동의는 원래 화면(또는 `/chat`, 미확정)으로 이동
  (1절 참고).
- 세부 법적 문구는 이 설계 범위 밖 — 법률 검토가 필요할 수 있어 추측하지 않는다.

### 8. 대화 히스토리 목록 (`/conversations`)

- 채택 **확정**([[anyang-service-scope]], user, 2026-09-27).
- `GET /api/conversations`([[anyang-backend-api#3-1. 대화 히스토리 조회 — 채택]]) 응답을
  `updated_at desc` 순 카드/리스트로 표시(각 항목 `title`, 마지막 갱신 시각). 항목 클릭 시
  `GET /api/conversations/:id/messages`로 과거 메시지를 불러와 `/chat`에서 이어서 연다
  (제안, 미확정 — 예: `/chat?conversation_id=...` 쿼리 또는 상태 전달 방식은 미확정).
- 새 대화 시작 버튼(제안, 미확정) — `/chat`으로 이동하며 `conversation_id` 없이 진입.
- 빈 목록일 때 안내 문구: "아직 대화 기록이 없어요."

### 8-1. 계정 탈퇴 (`/settings/account`, 신규 반영)

- `DELETE /api/account`([[anyang-backend-api#1-3. 사용자 탈퇴 API (제안, 미확정)]]) 호출로
  본인 탈퇴. 되돌릴 수 없는 동작이므로 확인 다이얼로그(네이티브 `window.confirm` 또는 모달,
  10절 관리자 화면과 같은 패턴, 미확정)를 거친 뒤에만 호출한다(제안).
- 안내 문구(제안, 미확정): 탈퇴하면 프로필·대화·기억·알림 설정 등 계정 데이터는 즉시
  삭제되지만, 동의 기록(`consents`)은 증빙용으로 1년간 보관된 뒤 삭제된다는 점(보관 기간
  **확정**, [[anyang-service-scope]], user, 2026-09-27,
  [[anyang-database-schema#consents — 가입 시 개인정보 필수 동의 기록]] 참고)을
  확인 다이얼로그 또는 화면 문구에 표시한다.
- 탈퇴 성공 시 세션이 종료되고 `/login`으로 이동한다(backend 1-3절 — 세션 쿠키 무효화).
- 이 화면의 정확한 배치(별도 페이지 vs 알림 설정 화면 하단 등)는 미확정 — 1차 제안은 별도
  `/settings/account` 페이지.

### 9. 개인정보 처리방침 페이지 (`/privacy-policy`)

- 정적 콘텐츠 페이지(제안, 미확정) — 수집 항목·목적, DeepSeek·Gemini 국외 이전 고지, 보관·
  삭제 정책 등 실제 문구는 법률 검토 후 확정(이 설계 범위 밖). 로그인 여부와 무관하게
  접근 가능(제안, 미확정).
- 2절 동의 화면에서 이 페이지로 링크한다.
- **고지 항목에 반영해야 할 것(제안, 문구는 법률 검토 후 확정)**:
  - 탈퇴 시 동의 기록은 즉시 삭제되지 않고 증빙용으로 1년간 보관된 뒤 삭제된다(보관 기간
    **확정**, [[anyang-service-scope]], user, 2026-09-27,
    [[anyang-database-schema#consents — 가입 시 개인정보 필수 동의 기록]] 참고).
  - 수집 실행 이력·외부 API 사용량 기록은 90일 보존 후 삭제된다(**확정**,
    [[anyang-service-scope]], user, 2026-09-27). 알림 발송 로그는 중복 발송 방지 목적으로
    삭제 대상에서 제외된다.
  - DeepSeek(중국 서버 처리)·Gemini(임베딩, 무료 티어) 국외 이전 고지에 Gemini로 대화 내용을
    전송한다는 사실(채팅 RAG 검색을 위한 사용자 메시지 임베딩, 전송 전 전화번호·이메일·
    주민등록번호 형태는 정규식으로 가린 뒤 전송)을 포함한다([[anyang-ai-models-data-transfer]],
    user, 2026-09-27 — 7절과 동일 고지).

### 10. 관리자 공통 레이아웃 (`/admin`, 미확정)

- 화면 4종 채택 **확정**([[anyang-service-scope]], user, 2026-09-27). 접근 판정은 서버가 하고
  (공통 레이아웃 절의 "관리자 가드" 참고), 이 절은 관리자로 판정된 뒤 화면 구성만 다룬다.
  판정 자체는 `ADMIN_EMAILS`에 있으면서 **이번 로그인을 Google로 한 경우에만** 통과한다
  (backend 13-0절) — 같은 이메일이 과거 Google로 가입했더라도 이번 세션을 이메일·
  비밀번호(Credentials)로 로그인했다면 관리자가 될 수 없다. 관리자 화면 어디에도 로그인
  방식 선택 UI는 없다 — 이번 세션을 Google로 로그인한 뒤 접근하는 것으로 충분하며, 별도
  안내는 관리자가 아니라는 403(`ADMIN_ONLY`) 응답을 받았을 때만 보여준다(공통 레이아웃 절
  "403 응답 분기" 참고).
  하단 탭(일반 사용자용)과는 별도로 `/admin` 하위에 4개 화면을 잇는 상단 탭 또는 사이드
  내비게이션(제안, 미확정 — 모바일 우선 원칙과 무관하게 관리자 화면은 데스크톱 사용 비중이
  높을 것으로 가정하지만, 별도 데스크톱 전용 레이아웃을 새로 만들지 않고 기존 공통 레이아웃
  중앙 정렬 고정폭을 그대로 쓴다, YAGNI).
- 개인별 대화 내용·기억 원문은 어떤 관리자 화면에도 표시하지 않는다(확정 원칙,
  [[anyang-backend-api#13-0. 공통 인가]] — 애초에 해당 API가 그런 필드를 응답하지 않으므로
  프런트가 실수로 렌더링할 필드 자체가 없다).
- **되돌리기 어려운 동작의 확인 단계**(사용자 지시로 방식은 제안): 계정 정지·정지 해제·삭제
  3개 동작 모두 버튼 클릭 시 바로 실행하지 않고 확인 다이얼로그(네이티브 `window.confirm`
  또는 모달 컴포넌트, 미확정)를 띄운다. 삭제는 되돌릴 수 없으므로(cascade 삭제,
  [[anyang-backend-api#13-3. 사용자 관리·통계]]) 확인 다이얼로그에 대상 이메일을 표시해
  실수 클릭을 줄인다(제안). 정지/정지 해제는 되돌릴 수 있으므로 단순 확인만으로 충분(제안).

### 11. 공지 수집 관리 (`/admin/collect-runs`, 미확정)

- `GET /api/admin/collect-runs`([[anyang-backend-api#13-1. 공지 수집 관리]]) 결과를 최신순
  테이블/리스트로 표시(제안, 미확정 컬럼: 실행 시각, 트리거 종류(수동/스케줄), 성공 여부,
  수집 건수, 오류 요약 — [[glossary#수집 실행 기록]] 기준). 페이지네이션 방식은 backend와
  동일하게 미확정.
- 수동 수집 실행 버튼: `POST /api/admin/collect-runs` 호출. 이 호출은 최대 300초 걸릴 수
  있으므로([[anyang-backend-api#13-1. 공지 수집 관리]]) 클릭 즉시 버튼을 비활성화하고 "수집
  실행 중..." 진행 상태 표시(스피너, 제안)를 두며, 응답이 올 때까지(최대 300초) 페이지 이동을
  막지 않되 다른 수동 실행 재클릭은 막는다(제안, 미확정 — 타임아웃 시 오류 메시지 문구도
  미확정). 완료되면 목록을 새로고침한다.
- 공지 숨김/해제: 목록에 각 공지 행의 숨김/해제 토글 또는 버튼(제안, 미확정 — 이 화면에서
  공지 목록 자체를 보여줄지, 아니면 11절이 실행 이력만 보여주고 숨김/해제는 별도 하위 화면
  (`/admin/notices`)으로 둘지는 미확정. 1차 제안은 같은 화면 안에 탭으로 "실행 이력" /
  "공지 목록"을 나누는 것). `PATCH /api/admin/notices/:id/hide`, `.../unhide` 호출.
- 인증 필요(서버 401/403), 관리자만.

### 12. 알림 발송 현황 (`/admin/notify-logs`, 미확정)

- `GET /api/admin/notify-logs/summary`([[anyang-backend-api#13-2. 알림 발송 현황]]) 응답을
  날짜별 표 또는 막대 차트로 표시(차트 라이브러리 도입 여부 미확정 — 제안은 표만으로 충분,
  새 차트 라이브러리 추가는 YAGNI 위반 소지가 있어 이번 설계에서는 표를 기본안으로 하고
  차트가 필요하면 별도 확인). 날짜 범위(`from`/`to`) 선택 UI(네이티브 `<input type="date">`
  2개, 제안, 미확정).
- 상단에 집계 값 표시: `notify_enabled_count`, `push_device_count`(둘 다,
  [[anyang-backend-api#13-2. 알림 발송 현황]] 기준 — [[glossary#알림 발송 기록]] 참고).
- 인증 필요, 관리자만.

### 13. 사용자 관리·통계 (`/admin/users`, 미확정)

- 통계: `GET /api/admin/stats`([[anyang-backend-api#13-3. 사용자 관리·통계]]) 응답
  (`total_users`, 연령대·직군·재학재직 집계)을 카드/표로 표시(차트 여부 미확정, 12절과 동일
  판단으로 표 기본안).
- 사용자 목록: `GET /api/admin/users` 응답(`id`, `email`, `created_at`, `suspended_at`만)을
  테이블로 표시. 이름·프로필 상세·대화 관련 필드는 서버가 애초에 반환하지 않으므로 화면에도
  없다(원문·개인 상세 비노출 원칙 자동 준수).
- 각 행에 "정지"/"정지 해제"(현재 `suspended_at` 값에 따라 둘 중 하나만 노출, 제안) 버튼과
  "삭제" 버튼. 10절의 확인 다이얼로그를 거쳐 각각 `PATCH /api/admin/users/:id/suspend`,
  `.../unsuspend`, `DELETE /api/admin/users/:id` 호출. 성공 시 목록에서 상태 갱신(정지) 또는
  행 제거(삭제).
- 삭제 확인 다이얼로그 문구(제안, 미확정): 대상 이메일 표시 외에, 1-3절 탈퇴와 같은 처리
  순서([[anyang-backend-api#13-3. 사용자 관리·통계]] — `consents.withdrawn_at`을 먼저 채운
  뒤 `users` 행 삭제)를 따르므로 "동의 기록은 증빙용으로 1년간 보관된 뒤 삭제되고, 나머지
  계정 데이터는 즉시 삭제됩니다"(보관 기간 **확정**, [[anyang-service-scope]], user,
  2026-09-27) 안내를 덧붙인다(8-1절 사용자 본인 탈퇴 안내 문구와 동일 취지).
- 인증 필요, 관리자만.

### 14. 외부 API 사용량 (`/admin/api-usage`, 미확정)

- `GET /api/admin/api-usage/summary`([[anyang-backend-api#13-4. 외부 API 사용량]]) 응답을
  제공자(DeepSeek/Gemini)별 날짜별 표로 표시: 호출 수, 오류 수, 토큰 수, `limit_note`(무료
  한도 대비 사용량 문자열, DeepSeek 행은 null이므로 "-" 표시, 제안).
  ([[glossary#외부 API 사용 기록]] 참고)
- 날짜 범위 선택 UI는 12절과 동일 패턴(제안, 미확정).
- 인증 필요, 관리자만.

### PWA — manifest·서비스워커

- `app/manifest.ts`(Next.js App Router 표준 방식, 별도 라이브러리 불필요 — 이미 프레임워크
  기능): `name`, `short_name`, `icons`(192/512px, 미확정 — 디자인 자산 없음), `start_url: '/'`,
  `display: 'standalone'`, `theme_color`/`background_color`.
- 서비스워커: Web Push 수신·표시(`push` 이벤트 → `self.registration.showNotification`)와
  클릭 시 앱 포커스/열기(`notificationclick`)만 담당한다(제안, 미확정). 오프라인 캐싱
  전략(프리캐시 자산 목록 등)은 이번 요청 범위에 없다 — 요청되지 않은 오프라인 지원까지
  만들지 않는다(YAGNI). 필요해지면 별도 요청으로 재설계.
- 서비스워커 등록 위치(제안, 미확정): 루트 레이아웃 클라이언트 컴포넌트에서
  `navigator.serviceWorker.register('/sw.js')` 1회 호출. Vercel 전용 기능이 아니라 표준
  Web API만 사용 — 이전 가능성 원칙과 충돌 없음.
- VAPID 공개키는 서버 환경변수 `VAPID_PUBLIC_KEY`([[anyang-backend-api#9. 환경변수 목록]])를
  클라이언트에 안전하게 노출하는 방법(Next.js `NEXT_PUBLIC_` 환경변수 또는 API로 전달, 미확정)이
  필요 — 공개키는 비밀값이 아니므로 노출 자체는 문제 없다(제안).

## 테스트 방법

- **로그인/가입**: Google 로그인 목(mock) 콜백으로 신규/기존 사용자 리다이렉트 분기 확인.
  이메일 중복 가입 시 409 오류 메시지 노출 확인. 잘못된 비밀번호 로그인 시 오류 메시지 확인.
  이미 이메일·비밀번호로 가입된 이메일로 Google 로그인 시도 시 `OAuthAccountNotLinked`
  오류를 비밀번호 오류와 다른 안내 문구로 표시하는지 확인.
- **개인정보 동의**: 체크박스 2개(수집·이용, 국외 이전) 중 1개만 체크한 상태로 제출 시도 시
  진행되지 않는지 확인(제출 버튼 비활성 또는 오류). 둘 다 체크 후 이메일 가입은
  `POST /api/auth/register`에 `consents: { collection_use: true, overseas_transfer: true }`가
  담기는지, Google 신규 가입은 `POST /api/auth/consent`(같은 `consents` body) 호출 후
  `/onboarding`으로 이동하는지 확인. 처리방침 페이지 링크 이동 확인.
- **재동의 강제**: 인증 필요 API 응답을 403 + `{ error: "CONSENT_REQUIRED" }`로 목(mock)
  처리했을 때 공통 인증 가드가 `/consent`로 리다이렉트하는지, 두 체크박스를 다시 체크해
  제출하면 `POST /api/auth/consent`가 재호출되고 원래 흐름으로 복귀하는지, 이 화면에 탈퇴
  경로 링크가 함께 보이는지 확인.
- **비밀번호 찾기 링크 없음**: 로그인 화면에 비밀번호 재설정으로 이동하는 링크나 폼이
  존재하지 않고, "Google로 로그인" 안내 문구만 표시되는지 확인.
- **온보딩**: 필수 아님(null 허용) 항목을 비워도 제출 성공 확인. 제출 후 `/chat` 이동 확인.
- **채팅**: 스트리밍 응답이 토큰 단위로 화면에 이어붙는지 확인(목 SSE 스트림). 공지 인용
  카드 클릭 시 `/notices/[id]`로 이동하는지 확인.
- **추천 공지 피드·상세**: 목록 카드 클릭 → 상세 진입 확인. `source_url` 링크가 새 탭으로
  열리는지 확인(원문 링크 무결성).
- **알림 설정**: 토글 on 시 브라우저 알림 권한 요청 프롬프트가 뜨는지 확인(로컬 개발
  `localhost`는 HTTPS 예외로 Notification API 사용 가능 — 운영 배포는 Vercel 기본 도메인
  (`*.vercel.app`)도 HTTPS이므로 커스텀 도메인 연결 전에도 문제 없다 — 커스텀 도메인은
  나중에 붙는다([[anyang-deployment-portability]] 원칙 5). 권한 거부 시 토글이 다시 꺼지는지
  확인. 허용 시 `POST /api/push/subscribe` 호출 페이로드에 `endpoint`/`p256dh`/`auth`가
  담기는지 확인. 토글 근처에 "알림을 켠 시점 이후 공지만 알림 대상"이라는 안내 문구가
  표시되는지 확인.
- **서비스워커**: 브라우저 개발자 도구 Application 탭에서 서비스워커가 `activated` 상태인지
  확인. 목 푸시 이벤트를 개발자 도구에서 수동 트리거해 알림이 표시되는지 확인.
- **PWA 설치**: 모바일 브라우저(Chrome/Safari) 또는 데스크톱 Chrome에서 "홈 화면에 추가"/설치
  프롬프트가 뜨는지 확인. manifest 유효성은 Chrome DevTools "Application → Manifest" 패널로
  오류 없는지 확인.
- **"AI가 기억하는 내 정보"**: 목록 표시, 수정 후 목록에 반영되는지(재임베딩 실패 시 값이
  되돌아가는지) 확인, 삭제 후 목록에서 사라지는지 확인. 빈 목록 안내 문구 확인.
- **대화 히스토리**: 목록이 `updated_at desc` 순으로 오는지 확인. 항목 클릭 시 과거 메시지가
  로드되며 `/chat`에서 이어지는지 확인. 새 대화 시작 버튼이 빈 대화로 진입하는지 확인.
- **계정 탈퇴 확인**: 탈퇴 버튼 클릭 시 확인 다이얼로그가 뜨는지, 취소 시 `DELETE /api/account`
  가 호출되지 않는지, 확인 시 호출되고 성공 후 세션이 종료돼 `/login`으로 이동하는지 확인.
  보관 안내 문구가 표시되는지 확인.
- **도메인 변경 재구독 유도**: 구독이 없는데 `enabled=true`인 상태를 목으로 만들어 배너가
  뜨는지, 재구독 흐름이 다시 동작하는지 확인.
- **인증 가드**: 미로그인 상태로 `/chat`, `/notices`, `/settings/notifications` 직접 접근 시
  `/login`으로 리다이렉트되는지 확인. 프로필 없는 로그인 사용자가 `/chat` 접근 시
  `/onboarding`으로 리다이렉트되는지 확인. 동의하지 않은 사용자가 `/chat` 등에 접근 시
  403 + `{ error: "CONSENT_REQUIRED" }` 응답을 기준으로 `/consent`로 리다이렉트되는지
  확인(제안, 미확정 — 판정 방식).
- **정지 계정 안내**: 정지된 계정(이메일·비밀번호, Google 모두)으로 로그인이 정상적으로
  성공하는지(차단되지 않음) 확인하고, `session.suspended`가 true인 상태를 목으로 만들어
  로그인 직후 정지 안내 화면으로 이동하는지 확인. 정지 안내 화면에서 로그아웃·탈퇴 외 다른
  화면 이동을 시도하면 403 + `{ error: "ACCOUNT_SUSPENDED" }` 응답을 기준으로 정지 안내
  화면으로 되돌아가는지(세션이 종료되지 않는지) 확인. 이 화면에 탈퇴 경로 링크가 함께
  보이는지 확인.
- **관리자 접근 차단**: 관리자가 아닌 로그인 사용자(또는 `ADMIN_EMAILS`에 있지만 이번
  세션을 Credentials로 로그인한 경우)로 `/admin/*` 4개 화면에 직접 URL 접근 시 데이터가
  렌더링되지 않고 403 + `{ error: "ADMIN_ONLY" }` 응답 기준으로 "관리자 계정이 아닙니다"
  안내와 함께 `/chat`으로 리다이렉트되는지 확인. 소스맵·번들(`grep`으로 빌드 산출물 검사)에
  `ADMIN_EMAILS` 값이나 관리자 이메일 문자열이 포함되지 않는지 확인.
- **관리자 이메일 가입 차단**: `ADMIN_EMAILS`에 있는 이메일로 이메일·비밀번호 가입 시도 시
  403 + `{ error: "ADMIN_EMAIL_RESERVED" }` 응답을 기준으로 인라인 오류 문구가 표시되고
  가입이 진행되지 않는지 확인.
- **관리자 원문 비노출**: 4개 관리자 화면 어디에도 `messages`/`preference_text` 등 대화·기억
  원문을 렌더링하는 코드 경로가 없는지 확인(해당 API 응답에 그 필드가 없으므로 코드 리뷰로
  확인 — 자동 테스트로는 응답 payload에 없는 필드를 화면이 참조하지 않는지 타입 체크로
  간접 확인).
- **공지 수집 관리**: 수동 수집 실행 클릭 시 버튼이 비활성화되고 진행 상태가 표시되는지,
  완료 후 목록이 갱신되는지 확인. 숨김/해제 버튼 클릭 후 상태가 반영되는지 확인.
- **알림 발송 현황·외부 API 사용량**: 날짜 범위 변경 시 표 데이터가 갱신되는지 확인.
- **사용자 관리·통계**: 정지/정지 해제/삭제 버튼 클릭 시 확인 다이얼로그가 뜨는지, 취소 시
  아무 API도 호출되지 않는지, 확인 시 해당 API가 호출되고 화면이 갱신되는지 확인.

## 확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)

1. `occupation_type` 온보딩 입력 컴포넌트(select vs 라디오 그룹) — 2절에 제안만
   적었다. 설계 승인으로 확정된다.

(2026-09-27 해결: 프로필 코드값 셋(`gender`, `occupation_type`, `enrollment_status`)은
[[anyang-service-scope]] "프로필 선택지" 행(user, 2026-09-27)에서 확정됐다 — 2절 참고.)

(2026-09-27 해결: 동의 체크박스 분리 여부, 비밀번호 재설정 포함 여부는
[[anyang-service-scope]] 결정으로 확정됐다 — 7절, 1절, 10절 참고.)

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
