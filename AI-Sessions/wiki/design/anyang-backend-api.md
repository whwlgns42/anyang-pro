---
type: design
date: 2026-09-27
status: active
owner: backend
---

# 안양 청년정책 비서 — Backend API 계약 설계

## Summary

Next.js(App Router) Route Handler로 인증(동의 게이트 포함), 프로필 CRUD, 알림 설정,
"AI가 기억하는 내 정보"(조회·수정·삭제), 대화 히스토리 조회, 채팅(DeepSeek 스트리밍 + RAG),
Gemini 임베딩, 공지 수집기(안양시 청년 게시판 1개), 임베딩 파이프라인, 스케줄러(수집·알림 잡),
Web Push, 관리자 API(`/api/admin/*`, `ADMIN_EMAILS` 기반)를 제공한다. 스키마는
[[anyang-database-schema]]를 따른다. 이 문서의 엔드포인트·값은 모두 제안이며 ``이고,
사용자 설계 승인으로 확정된다.

**2026-09-28 개정(확인 항목 22·23)**: 채팅 응답에 인용 공지 스트림 계약(3-2절)과 관리자용
`GET /api/admin/notices`(13-1절)를 추가했다. 둘 다 기존 스키마
([[anyang-database-schema]])로 구현 가능하며 스키마 변경이 필요하지 않다. 값은 모두
``이며 재승인 대상이다.

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
- 확정([[anyang-service-scope]], user, 2026-09-27, 관리자 페이지 추가 요청 반영): 관리자는
  DB 역할 컬럼 없이 환경변수 `ADMIN_EMAILS`로만 지정하고, 관리자 API는 서버가 매 요청 세션
  이메일을 확인한다. 관리자 기능 4종(공지 수집 관리, 알림 발송 현황, 사용자 관리·통계, 외부
  API 사용량)과 "대화·기억 원문 비노출" 원칙도 확정. 13절에 API 계약을 둔다. database가 이
  기능을 담을 `collect_runs`/`notify_logs`/`api_usage_logs`/`notices.hidden_at`/
  `users.suspended_at`을 [[anyang-database-schema]]에 이미 추가했다(테이블 구조 자체는
  아직 미확정).
- 이 세션(backend)에는 웹 접근 도구가 없어 수집 대상 게시판의 `robots.txt`와 실제 HTML 구조는
  이번 설계에서 확인하지 못했다 — **구현 전 확인**으로 남긴다(5절).
- 확정([[anyang-service-scope]], user, 2026-09-27, 반영 완료): 동의는 "수집·이용"/"국외
  이전" 분리 각각 필수(1절), 처리방침 개정 시 재동의 강제(1절), 탈퇴 시 `consents` 즉시
  삭제 아님·보관 후 삭제(1-3절, 13-3절), 비밀번호 재설정 1차 출시 제외·Google 로그인
  안내(1-1절). database가 `consents`(`consent_type`/`withdrawn_at`)와
  `notify_logs`(`pending`/`reserved_at`/`sent_at`) 컬럼을
  [[anyang-database-schema]]에 이미 반영했다 — 이 문서의 관련 절을 그 구조에 맞춰 갱신했다.
- 로그 보존(확정, [[anyang-service-scope]], user, 2026-09-27): `collect_runs`/
  `api_usage_logs` 90일 정리 잡은 pg_cron이 직접 실행하는 SQL(database 소관,
  [[anyang-database-schema#로그성 테이블 보존 기간·정리 잡]])이라 별도 backend API
  엔드포인트는 없다. [[anyang-backend-tasks]]에 구현 단계 작업 단위로만 등록해 실행 승인
  누락을 방지한다. `notify_logs`는 이 정리 대상에서 제외(확정).
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
  - `POST /api/auth/register` — body
    `{ email, password, consents: { collection_use: true, overseas_transfer: true } }`.
    동의는 "수집·이용"과 "국외 이전"을 분리해 각각 받는 것이 확정([[anyang-service-scope]],
    user, 2026-09-27)이므로 body도 항목별 boolean 2개로 받는다. 둘 중 하나라도 `true`가
    아니면(누락 포함) 400으로 거부(가입 완료 불가). 동의 검사 전에 email이 `ADMIN_EMAILS`에
    있으면 403(`ADMIN_EMAIL_RESERVED`, 1-4절, 13-0절 신규)으로 거부한다(제안, 미확정 —
    관리자 이메일은 Google 로그인으로만 가입 가능). 둘 다 `true`면 트랜잭션으로 `users` +
    `credentials` 생성 후 `consents`에 **2행**(각 `consent_type`마다 1행,
    `policy_version=POLICY_VERSION`(아래), `consented_at=now()`) 기록. 이미 가입된 email이면
    409.
- **Google 로그인 시 동의**: Auth.js 표준 콜백(`signIn`)에서 `users` 테이블에 없는 신규
  사용자면 로그인을 바로 완료시키지 않고, 프런트가 동의 화면을 먼저 보여준 뒤
  `POST /api/auth/consent`(미확정, 세션 필요)를 호출해 `consents` 행을 남겨야 가입이 완료된
  것으로 처리한다(제안, 미확정) — Google OAuth 콜백 자체에서 동의를 막을 수 없어 "가입 완료"
  여부를 두 `consent_type` 모두의 현재 `POLICY_VERSION` 동의 존재 여부로 판단하는 방식.
  body: `{ consents: { collection_use: true, overseas_transfer: true } }` — 회원가입과
  같은 형식, 둘 다 `true`가 아니면 400. 이 엔드포인트는 재동의(아래)에도 그대로 재사용한다.
  동의 전(또는 재동의 전) 사용자는 로그인은 되지만 다른 API가 아래 미들웨어에서
  403(동의 필요)을 반환한다.
- **`consents.policy_version` 관리 위치(제안, 채택)**: "현재 처리방침 버전"은 환경변수가
  아니라 **코드 상수**로 관리한다 — `lib/consent.ts`(미확정 경로)에
  `export const POLICY_VERSION = "2026-09-27"`(예시, 날짜 문자열) 형태로 단일 값을 둔다.
  환경변수 대신 코드 상수를 고른 이유(제안): 처리방침 문구를 바꿀 때 코드 리뷰·git 이력으로
  버전 변경이 함께 추적되고, Vercel 환경변수처럼 배포 환경마다 값이 어긋날 위험이 없다(둘
  다 재배포가 필요하므로 배포 부담은 같음, YAGNI — 여러 환경에서 다른 버전을 쓸 이유가
  없다). 회원가입·재동의 API가 `consents` 행을 만들 때 이 상수를 `policy_version`에 그대로
  쓴다.
- **재동의 판정 위치(제안, 채택)**: 1-2절의 정지 계정 확인과 같은 인증 필요 API 공통
  미들웨어(`middleware.ts` 또는 공통 헬퍼, 미확정 이름)에서 `suspended_at` 확인 다음 순서로
  검사한다 — 로그인 사용자의 `consent_type`(`collection_use`, `overseas_transfer`) 각각에
  대해 `consented_at`이 가장 최근인 행의 `policy_version`이 현재 `POLICY_VERSION`과 같은지
  확인한다. 하나라도 다르거나 기록이 없으면 403(재동의 필요, 에러 코드
  `CONSENT_REQUIRED` — 1-4절 참고, 응답 body에 필요한 `consent_type` 목록 포함, 제안)을
  반환해 프런트가 재동의 화면으로 보내게 한다. 예외:
  `/api/auth/*`, `/api/auth/consent` 자신, `/api/admin/*`(관리자는 13-0절 별도 인가),
  `DELETE /api/account`(제안, 미확정 — 재동의하지 않은 사용자도 탈퇴는 막지 않는다. 처리방침에
  재동의하지 않으려는 사용자에게 사실상 탈퇴 외 선택지가 없어지는 것을 막기 위함)는 이
  검사에서 제외한다. 재동의는 `POST /api/auth/consent`를 그대로 호출해
  처리한다(위와 동일 엔드포인트 재사용, 새 엔드포인트를 만들지 않는다 — YAGNI).
- Auth.js 표준 콜백(`signIn`, `session`, `jwt`)에서 `users` 테이블에 없는 신규 Google 로그인
  사용자는 자동 생성(Auth.js 어댑터 기본 동작).
- 커스텀 도메인은 배포 시점에 붙이므로 `NEXTAUTH_URL`/`AUTH_URL`은 `APP_ORIGIN` 환경변수로
  설정한다(확정 원칙, [[anyang-deployment-portability]] 원칙 5).

### 1-1. 이메일 인증·비밀번호 재설정 — `verification_tokens` 미사용에 따른 정리 (확정)

`verification_tokens`는 쓰지 않기로 확정됐다([[anyang-service-scope]], user, 2026-09-27).
이 테이블 없이 두 흐름을 어떻게 처리할지 정리한다.

- **이메일 인증(가입 확인 메일)**: 만들지 않는다(제안 유지) — 서비스가 상업적 피해 위험이
  낮은 정책 알림 도구이고, 이메일 인증 없이도 실질적 피해가 적다고 판단. 이메일은 가입 시
  입력한 값을 검증 없이 신뢰한다(`users.email_verified`는 계속 null로 둔다).
- **비밀번호 재설정("비밀번호 찾기") — 1차 출시 제외(확정, [[anyang-service-scope]], user,
  2026-09-27)**: 비밀번호를 잊은 사용자에게는 Google 로그인으로 대체 안내한다(프런트 화면
  문구 — frontend 소관). 이에 따라 다음을 이번 스콥에서 제거/제외한다.
  - `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` 엔드포인트를 만들지
    않는다(이전 draft의 제안이었으며 폐기).
  - 이메일 발송 수단(SMTP/서비스)도 이 서비스에는 필요 없다 — 다른 흐름(알림은 Web
    Push이지 이메일이 아니다)에서도 이메일 발송이 없으므로 이 프로젝트 전체에 이메일 발송
    인프라를 두지 않는다(YAGNI).
  - Credentials(이메일·비밀번호) 가입 사용자가 비밀번호를 잊으면 계정 복구 수단이 없다는
    한계가 생긴다 — Google 로그인 계정으로 새로 가입하거나, 관리자에게 문의해 계정 삭제
    (13-3절) 후 재가입하는 것이 유일한 우회로다(제안, 한계 인지, frontend 안내 문구에 반영
    필요 — "frontend 반영 필요"로 보고).

### 1-2. 정지 계정 제한 방식

(제안, 미확정 — 2차 재점검 반영: 로그인 차단 방식 폐기)

`users.suspended_at`은 database가 제안한 컬럼이다([[anyang-database-schema#users
]]). 정지는 로그인 자체를 막는 제재가 아니라 **이용 제한**으로 처리한다(제안, 채택) —
정지된 사용자도 로그인해 정지 사유를 확인하고 탈퇴할 수 있어야 한다는 판단이다.

1. **로그인은 항상 허용**: Auth.js `signIn` 콜백에서 `suspended_at`을 이유로 로그인을 거부하지
   않는다(이전 draft의 "신규 로그인 차단" 제안은 폐기). 로그인 성공 시 `jwt`/`session`
   콜백이 `suspended_at is not null` 여부를 세션에 포함한다(제안, 미확정 필드명:
   `session.suspended`, boolean) — frontend가 별도 API 호출 없이 정지 안내 화면을 바로 그릴
   수 있다(YAGNI — 정지 안내 전용 조회 엔드포인트를 새로 만들지 않는다).
2. **정지 중 허용되는 것**: 정지 안내 화면 표시(위 세션 필드로 충분), 로그아웃(Auth.js
   표준), `DELETE /api/account`(1-3절)뿐이다.
3. **그 외 모든 인증 필요 API**: `/api/admin/*`와 `DELETE /api/account`를 제외한 인증 필요
   API 공통 미들웨어(Next.js `middleware.ts` 또는 각 라우트 공통 헬퍼, 미확정)에서 매
   요청마다 `users.suspended_at`을 조회해 not null이면 403(에러 코드 `ACCOUNT_SUSPENDED` —
   1-4절 참고)으로 거부한다. 이 서비스 규모에서는 요청마다 1회 단순 조회 추가가 과설계가
   아니라고 판단한다(제안, 기존 유지) — JWT에 정지 여부만 캐싱하고 매 요청 재확인을 생략하면
   정지 후에도 세션 만료까지 계속 접근 가능해지는 문제가 더 크다(위 1번의 `session.suspended`
   는 안내 화면 표시용일 뿐, 접근 차단 판정에는 쓰지 않는다 — 판정은 이 미들웨어의 매 요청
   DB 조회로만 한다). `DELETE /api/account`를 예외로 두는 이유(제안, 미확정): 정지된
   사용자도 탈퇴할 권리 자체는 막지 않는다 — 정지가 서비스 이용 제한이지 계정 삭제 금지는
   아니라고 판단했다.
4. notify-job은 [[anyang-database-schema#pg_cron / pg_net 잡 정의]]의 쿼리대로
   `u.suspended_at is null` 조건으로 대상에서 제외한다(database 제안 그대로 채택, 변경 없음).

### 1-3. 사용자 탈퇴 API (제안, 미확정)

탈퇴 시 동의 기록(`consents`)은 즉시 삭제하지 않고 증빙용으로 보관한 뒤 삭제한다(확정,
[[anyang-service-scope]], user, 2026-09-27). [[anyang-database-schema#consents —
가입 시 개인정보 필수 동의 기록]]의 "탈퇴 후 보관" 절(`on delete set null` +
`withdrawn_at`)을 그대로 따른다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| DELETE | `/api/account` | 로그인 사용자 본인 탈퇴 |

- 처리 순서(애플리케이션 트랜잭션, 제안):
  1. `UPDATE consents SET withdrawn_at = now() WHERE user_id = $1 AND withdrawn_at IS NULL`
  2. `DELETE FROM users WHERE id = $1` — database 문서의 cascade 정책에 따라
     profiles/accounts/credentials/conversations/push_subscriptions/notify_settings/
     user_preferences가 함께 삭제된다. `consents`는 `on delete set null`이므로 1번에서
     `withdrawn_at`을 채운 행이 삭제되지 않고 `user_id`만 null이 된다(증빙 보관).
  - 1번을 반드시 2번보다 먼저 실행한다 — 순서가 바뀌면 `user_id`가 이미 null이 된 뒤라
    "이 사용자의 동의 기록"을 특정해 `withdrawn_at`을 채울 수 없다.
- 인증 필요(세션 없으면 401). 세션 쿠키는 삭제 성공 응답과 함께 무효화(Auth.js 로그아웃
  처리, 미확정 구현).
- 탈퇴 확인 다이얼로그는 frontend 소관(제안).

### 1-4. 403 응답 에러 코드 (제안, 미확정)

frontend가 403 응답의 원인(정지/재동의 필요/관리자 아님)을 분기해 다른 화면을 보여줄 수
있도록, 인증 필요 API가 반환하는 403 응답 body에 아래 문자열 중 하나를 `{ error: "<code>" }`
형태로 포함한다(제안, 미확정 — 키 이름 `error`도 미확정).

| 코드 | 발생 위치 | 의미 |
|---|---|---|
| `ACCOUNT_SUSPENDED` | 1-2절 정지 확인 | 계정이 정지되어 이용이 제한됨(로그인 자체는 허용, 1-2절 허용 경로 외 API 차단) |
| `CONSENT_REQUIRED` | 1절 재동의 판정 | 처리방침 개정으로 재동의 필요 |
| `ADMIN_ONLY` | 13-0절 관리자 인가 | 로그인은 됐으나 관리자가 아님(로그인 provider가 google이 아니거나 `ADMIN_EMAILS`에 없음) |
| `ADMIN_EMAIL_RESERVED` | 1절 가입 시점 차단(13-0절 신규) | `ADMIN_EMAILS`에 있는 이메일로 Credentials 가입을 시도함(제안, 미확정) |

- 관리자 거부는 **404가 아니라 403**으로 통일한다(13-0절에서 이미 결정한 대로 — 이 서비스는
  공개 attack surface가 아니므로 엔드포인트 존재를 숨길 필요가 낮고, 403이 frontend 처리도
  단순하다). 이 문서 전체에서 관리자 API의 "권한 없음"은 항상 403 + `ADMIN_ONLY`다.
- 401(비로그인)은 코드 문자열 없이 기존대로 빈 body 또는 최소 body를 반환한다(제안 —
  로그인 여부는 프런트가 세션 유무로 이미 알 수 있어 별도 코드가 필요 없다, YAGNI).

### 1-5. 이메일 계정 연결 정책 (신규, 제안, 미확정)

이메일 인증이 없으므로(1-1절) 타인의 이메일 주소로 먼저 이메일·비밀번호 가입을 해버리면 두
가지 문제가 생길 수 있다.

1. **진짜 주인이 Google 로그인을 못 함(계정 연결 off — 이 설계가 채택하는 기본값)**: Auth.js는
   `allowDangerousEmailAccountLinking`을 켜지 않는 한 서로 다른 provider 간 같은 email을
   자동 연결하지 않는다(기본값 off, 제안 채택 — 켜지 않는다). 이미 `credentials`로 가입된
   이메일로 Google 로그인을 시도하면 Auth.js가 `OAuthAccountNotLinked` 에러로 로그인을
   막는다. 이 경우 진짜 주인은 자신의 이메일로 서비스를 못 쓰게 된다.
2. **자동 연결을 켜면 계정이 섞인다(이 설계는 채택하지 않음)**: 공격자가 먼저 만든
   `credentials` 계정과 진짜 주인의 Google 로그인이 같은 `users` 행으로 합쳐져, 공격자가
   자신이 정한 비밀번호로 계속 그 계정(진짜 주인의 프로필·기억)에 접근할 수 있다 — 1번보다
   위험하므로 채택하지 않는다.

**처리 경로(제안, 미확정, 채택)**: 자동 연결 off를 유지한다. Google 로그인이
`OAuthAccountNotLinked`로 실패하면 frontend가 안내 메시지("이 이메일은 이미 비밀번호로
가입되어 있습니다. 비밀번호로 로그인하거나, 본인 계정이 아니면 관리자에게 문의해 주세요")를
보여준다(**frontend 반영 필요**). 이메일 인증이 없어 서버가 "진짜 주인"을 자동으로 판별할
방법이 없으므로, 최종 해결은 1-1절과 같은 방식에 의존한다 — 관리자가 13-3절
`DELETE /api/admin/users/:id`로 문제의 `credentials` 계정을 수동 삭제하면 진짜 주인이
Google로 재가입할 수 있다. 이 한계는 이메일 인증을 만들지 않기로 한 결정(1-1절)에서 이미
감수한 것과 같은 종류이며, 새 인프라(이메일 인증·소유권 확인 절차)를 추가하지 않는다(YAGNI).
자동 연결 여부 자체를 사용자가 다르게 정하고 싶다면 별도 확인이 필요하다 — 이 문서는 "off
유지"를 기본 제안으로 채택했다.

### 2. 프로필 CRUD

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/profile` | 로그인 사용자 본인 프로필 조회 |
| PUT | `/api/profile` | 본인 프로필 생성/갱신(upsert) |

- body(미확정, [[anyang-database-schema#profiles]] 컬럼 기준): `{ birth_year, gender,
  occupation_type, enrollment_status }`. 4항목으로 확정됐다([[anyang-service-scope]], user,
  2026-09-27) — 더 늘어나지 않는다.
- 인증 필요(세션 없으면 401). 본인 것만 접근(다른 user_id 조회 불가).

### 2-1. 추천 공지 피드·상세 (frontend 조율, 2026-09-27)

frontend가 채팅 밖에서 "나에게 맞는 공지 목록"과 개별 공지 상세를 보여줄 화면을 설계 중이라
아래 조회 엔드포인트를 제안한다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notices/recommended` | 로그인 사용자 프로필/선호 기준 추천 공지 목록(페이지네이션, 미확정) |
| GET | `/api/notices/:id` | 공지 상세 1건 |

- `/api/notices/recommended` 매칭 로직은 7절 `/api/jobs/notify`의 코사인 유사도 방식을
  재사용(제안, 미확정) — **프로필은 임베딩하지 않는다**([[anyang-ai-models-data-transfer]]
  확정). 선호(`user_preferences.embedding`)와 `notice_chunks` 유사도 상위 N건(N 미확정)을
  고른다. 프로필 조건(나이대·성별·직군)은 이 벡터 유사도 계산에 들어가지 않고, 3절과 같이
  DeepSeek 프롬프트 조건으로만 쓰이거나(채팅), 이 피드에서는 아예 쓰이지 않는다(제안,
  미확정 — 프로필 조건을 이 목록에도 반영할지는 이번 스콥에서 정하지 않는다).
- **선호가 없는 신규 사용자(제안, 미확정)**: `user_preferences` 행이 없으면(대화 이력이 없어
  선호가 추출되지 않은 상태) 유사도 계산 자체가 불가능하므로, 이 경우 최신 공지 순
  (`notices.collected_at desc`, `hidden_at is null`)으로 대체해 반환한다 — 빈 목록보다
  낫다는 판단(제안).
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
- **`enabled_at` 갱신(제안, [[anyang-database-schema#notify_settings (미확정 — 컬럼 타입은
  설계 승인 전, 항목 범위·시간대는 확정)]] 반영)**: `PUT /api/notify-settings`가 upsert할 때
  다음 규칙으로 `enabled_at`을 함께 쓴다.
  - 행이 없어 새로 만드는 경우(가입·온보딩 첫 설정): `enabled_at = now()`로 채운다(`enabled`
    기본값 `true` 여부와 무관하게 생성 시 항상 채움).
  - 기존 행이 있고 `enabled`가 `false → true`로 바뀌는 경우: `enabled_at = now()`로 갱신한다.
  - 그 외(이미 `true`를 유지, 또는 `true → false`로 끄는 경우): `enabled_at`을 건드리지 않는다.
  - 7절 알림 잡은 `enabled_at`이 null인 행(이 컬럼 도입 전 레거시)을 발송 대상에서 제외한다.
- 인증 필요(세션 없으면 401). 본인 것만 접근.

### 2-3. "AI가 기억하는 내 정보" (user_preferences) — 채택 (조회·수정·삭제)

이 화면은 채택으로 확정됐다([[anyang-service-scope]], user, 2026-09-27). 조회·수정·삭제를
지원한다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/preferences` | 로그인 사용자의 `user_preferences` 항목 목록(요약 문장 등) |
| PUT | `/api/preferences/:id` | 항목 1건의 `preference_text` 수정 |
| DELETE | `/api/preferences/:id` | 항목 1건 삭제 |

- `PUT /api/preferences/:id` body: `{ preference_text }`. 서버가 **동기로**
  Gemini 재임베딩을 호출해 `embedding`/`embedding_model`/`updated_at`을 함께 갱신한 뒤
  응답한다([[anyang-database-schema#user_preferences — 대화에서 추출한 선호,
  벡터. "AI가 기억하는 내 정보" 화면의 데이터]]의 "수정 시 재임베딩 필요" 절 반영). 재임베딩
  실패(4절 재시도 소진) 시 트랜잭션 롤백, 텍스트도 갱신하지 않고 5xx 응답(제안, 미확정) —
  텍스트와 임베딩이 어긋난 상태로 저장되면 검색 결과가 틀어지므로 둘을 한 트랜잭션으로 묶는다.
- 삭제는 행 DELETE로 충분(확정, [[anyang-service-scope]]).
- 인증 필요, 본인 것만 접근.

### 3. 채팅 — DeepSeek 스트리밍 + RAG

`POST /api/chat` — body `{ conversation_id?, message }`. SSE/스트리밍 응답
(Vercel Fluid 함수의 스트리밍 응답 사용, 미확정).

**흐름 (제안, 미확정)**:

0. **가림 처리(제안, 미확정 — 2차 재점검 반영: 적용 범위 확장)**: 사용자 메시지를 Gemini
   또는 DeepSeek로 보내기 전에 전화번호·이메일·주민등록번호 형태를 **정규식으로 가린다**
   (제안, 미확정 패턴 — user 결정, [[anyang-ai-models-data-transfer]], 2026-09-27). 원래
   Gemini 임베딩(아래 2-a)에만 적용하기로 했던 것을, 같은 원본 텍스트가 DeepSeek로도 전송되는
   3번(대화 컨텍스트)에도 동일하게 적용한다(제안, 채택) — 정규식 가림 대상은 어느 API로
   보내든 식별정보이므로 한쪽만 가리면 의미가 없다. **가림 함수는 한 곳에 두고**(예:
   `lib/mask-pii.ts`, 미확정 경로) Gemini·DeepSeek 전송 직전 두 지점 모두 이 함수를 호출한다
   — 같은 정규식을 두 곳에 복제하면 한쪽만 패턴이 갱신될 위험이 있다(YAGNI에 부합 —
   공용 함수 하나면 충분하고 provider별 별도 구현은 불필요).
1. 사용자 메시지를 `messages`에 저장(role=user) — 저장은 가림 처리 **전** 원문으로 한다(기존
   그대로, 이 서비스 DB 자체가 저장 대상이지 외부 전송 대상이 아니므로 이 변경과 무관).
2. RAG 검색:
   a. 위 0번에서 가린 메시지를 Gemini로 임베딩한다. 이 임베딩은 검색 쿼리 벡터로 한 번만 쓰고
      저장하지 않는다
      ([[anyang-database-schema#conversations / messages]]의 "채팅 사용자 메시지
      임베딩 저장 여부" 절 그대로 채택). `user_preferences.embedding`(누적 선호 벡터,
      있으면)과 가림 처리 후 임베딩한 벡터를 결합(예: 최근 선호 top-K 평균 + 현재 메시지
      임베딩, 가중치 미확정)해 쿼리 벡터를 만든다.
   b. `notice_chunks`에서 코사인 유사도 상위 K건(K 미확정, 제안 5)을 pgvector HNSW로 검색.
      이 검색 쿼리는 `notices.hidden_at is null` 조건을 포함해 숨김 공지를 원천 제외한다(5절
      숨김 처리 방식 그대로, 기존 구현 유지). **이 K건이 3-2절 인용 공지 목록의 원천이다**
      (제안, 미확정 — 검색과 인용이 같은 결과 집합을 쓴다. 별도 인용 전용 검색을 추가하지
      않는다, YAGNI).
   c. **프로필 조건 필터**: `notices`/`notice_chunks`에 정형화된 대상 조건 컬럼(연령·성별·
      직군 자격요건)을 두지 않는 것은 1차 출시 범위로 확정됐다([[anyang-service-scope]],
      user, 2026-09-27 — 게시판 구조 확인 여부와 무관하게 이번 스콥에서는 재검토하지
      않는다). 프로필도 임베딩하지 않는다([[anyang-ai-models-data-transfer]] 확정). 그래서
      프로필 조건(나이대·성별·직군)은 DB 쿼리 필터·벡터 유사도가 아니라 **DeepSeek 프롬프트의
      컨텍스트 조건**으로만 전달해 "이 조건에 맞는 것만 우선 언급"하도록 한다(제안,
      미확정). 자격요건 구조화 컬럼 도입은 이번 스콥 밖의 새 요구사항이므로, 필요해지면
      별도 설계 변경으로 database와 재조율한다.
3. DeepSeek API 호출(OpenAI 호환 Chat Completions, `stream: true`, 미확정). 전송 메시지에는
   **식별정보 없이** 다음만 포함: 프로필 조건 텍스트(나이대·성별·직군), 검색된 공지 제목·본문
   일부, 최근 대화 맥락(**0번에서 가린** 현재 사용자 메시지 포함). `email`, `name`, `user_id`는
   절대 포함하지 않는다([[anyang-ai-models-data-transfer]] 준수).
   - **요청 한도**: DeepSeek는 RPM이 아니라 계정 단위 동시성 제한이다(`deepseek-flash` 2500,
     `deepseek-v4-pro` 500 동시 요청, 초과 시 429). 출처(2026-09-27 확인):
     https://api-docs.deepseek.com/quick_start/rate_limit/. API가 지원하는 `user_id`
     파라미터로 사용자별 동시성을 관리할 수 있으나, 식별정보 전송 금지 원칙에 따라 실제
     `user_id`/`email`이 아닌 **서버가 발급한 무작위 내부 ID**만 이 파라미터에 넣는다(제안,
     미확정 — 예: `crypto.randomUUID()`를 세션마다 생성해 재사용).
4. **응답 스트리밍**(제안, 미확정 — 3-2절 인용 계약 반영): 클라이언트로 보내는 스트림 맨
   앞에 3-2절의 인용 이벤트 1개를 먼저 보낸 뒤, 이어서 DeepSeek SSE 청크를 그대로(tee)
   전달한다. 완료 후 `messages`에 저장(role=assistant, 인용 목록 자체는 저장하지 않는다 —
   2-b의 검색 결과에서 매번 다시 구할 수 있어 저장할 필요가 없다, YAGNI).
5. **선호 추출(제안, 미확정)**: 대화 종료 또는 N턴마다(N 미확정) DeepSeek에 "이 대화에서
   드러난 선호를 문장으로 요약" 요청(식별정보 없이 대화 내용만 전송) → 결과 문장에도 0번의
   가림 함수를 적용한 뒤(제안, 채택, 2차 재점검 반영 — 사용자가 대화 중 언급한 전화번호·
   이메일·주민등록번호 형태가 요약 문장에 그대로 옮겨질 수 있으므로) Gemini로 임베딩해
   `user_preferences`에 저장. 이 추출은 자유 텍스트 생성이라 Jev 대상이 아니다(문서·텍스트
   생성은 dev-common Jev 조건에서 제외).

**외부 전송 데이터 최소화 요약**: DeepSeek에는 조건·공지 텍스트·대화 텍스트(0번에서 가린
현재 사용자 메시지 포함)만, Gemini에는 공지 본문/선호 문장(0번 가림 적용, 5번)/채팅 사용자
메시지(0번 가림 적용, 2-a)만. 둘 다 `user_id`, `email`, `name` 미전송(제약은 애플리케이션
코드가 지킨다 — database 문서에도 기록됨). 가림 함수는 0번에서 정의한 공용 함수 하나를
DeepSeek·Gemini 두 지점 모두에서 재사용한다.

**`api_usage_logs` 기록 지점(제안, 미확정)**: DeepSeek 호출(위 3번)과 아래 4절 Gemini 임베딩
호출을 각각 감싸는 공통 래퍼 함수 안에서, 성공·실패와 무관하게 호출 직후 1행을 기록한다
(user_id 없음, [[anyang-database-schema#api_usage_logs]] 그대로). 값 셋(제안):
`provider`는 `deepseek` / `gemini`, `operation`은 DeepSeek는 `chat`, Gemini는 `embedding`
고정(둘 다 이 한 종류만 쓰므로 값이 늘 필요는 없다, YAGNI), `status`는 `success` /
`rate_limited`(429 응답) / `error`(그 외 실패). `input_tokens`/`output_tokens`는 제공자
응답에 토큰 수 필드가 있으면 채우고 없으면 null. 이 로그 기록 자체는 반복되지만 결정적
매핑(HTTP 상태 코드 → status 값)이라 Jev 대상이 아니다(dev-common 제외 조건).

### 3-1. 대화 히스토리 조회 — 채택

대화 히스토리 목록 화면은 채택으로 확정됐다([[anyang-service-scope]], user, 2026-09-27).

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/conversations` | 로그인 사용자의 대화 목록(제목, 마지막 갱신 시각) |
| GET | `/api/conversations/:id/messages` | 특정 대화의 과거 메시지 목록 |

- `messages`/`conversations` 테이블은 [[anyang-database-schema#conversations / messages
 ]]에 있다(컬럼: `conversations.id/user_id/title/created_at/updated_at`,
  `messages.id/conversation_id/role/content/created_at`). 목록은
  `(user_id, updated_at desc)` 인덱스로 최근 순 조회(database 문서 인덱스 제안).
- **`conversations.title` 자동 생성(제안, 미확정)**: 대화의 첫 사용자 메시지를 앞에서부터
  잘라(예: 30자, 미확정) 제목으로 저장한다. DeepSeek을 별도로 호출해 요약 제목을 생성하는
  방식은 이번 스콥에서 채택하지 않는다(YAGNI — 호출·비용·지연이 추가되는데 잘라내기로도
  목록 식별은 충분). 제목은 최초 생성 후 수정 API를 두지 않는다(제안, 미확정).
- 인증 필요, 본인 것만 접근.

### 3-2. 채팅 인용 공지 스트림 계약 (신규, 제안, 미확정 — 확인 항목 22 반영)

[[anyang-frontend-screens#3. 채팅]]의 인용 카드(제목 + `/notices/[id]` 링크)가 렌더링할 수
있도록, `POST /api/chat` 응답 스트림에 인용 공지 목록을 담는 이벤트를 추가한다. DeepSeek
SSE 청크 형식 자체는 바꾸지 않는다(그대로 tee해 전달, 3절 기존 구현 유지) — 인용 목록은
그 앞에 별도 이벤트로 한 번만 보낸다.

- **이벤트 형식(제안, 미확정)**: SSE 커스텀 이벤트 `event: citations`, 뒤이어
  `data: <JSON>\n\n` 한 줄. JSON 배열의 각 원소:
  `{ id, title, source_url, posted_at }` — `posted_at`은 `notices.published_at`
  ([[anyang-database-schema#notices — 공지 자격요건 구조화 컬럼 없음(확정)]], null 허용
  컬럼이므로 값이 null일 수 있다, 프런트가 null 처리). DeepSeek 표준 청크(`data:
  {"choices":[...]}`형)와 구분하려고 `event:` 필드를 쓴다 — 클라이언트가 `event:` 없는
  줄(`data:`만 있는 줄)은 기존처럼 OpenAI 호환 델타로, `event: citations`가 붙은 블록만
  인용 목록으로 파싱한다(제안, 미확정 — 정확한 파서 분기는 frontend 소관).
- **전송 시점(제안, 미확정)**: DeepSeek 호출(3절 3번) 직전, 2-b RAG 검색이 끝난 직후 스트림
  헤더를 연 뒤 이 이벤트 1개를 가장 먼저 쓰고, 그다음 DeepSeek 응답 스트림을 이어붙인다.
  인용 이벤트는 대화당 1회만 보낸다(대화 도중 갱신 없음, YAGNI).
- **원천(확정 — 위 2-b 반영)**: 2-b RAG 검색으로 이미 구한 상위 K개 `notice_chunks` 결과를
  그대로 쓴다. 같은 `notice_id`의 청크가 여러 건 뽑히면 **가장 유사도가 높은(검색 순서상
  먼저 나온) 1건만 남기고 중복 제거**한다(제안, 미확정 — 공지 단위로 카드 1개씩만 보여주면
  충분, 청크 단위로 여러 장 보여줄 필요 없다). 중복 제거 후 순서는 유사도 순 그대로 유지.
- **숨김 공지 제외(확정)**: 2-b 검색 쿼리 자체가 `notices.hidden_at is null` 조건을 이미
  포함하므로(위 2-b 수정 반영) 별도 필터가 필요 없다 — 검색 결과에 숨김 공지가 애초에
  섞이지 않는다.
- **빈 목록 처리(제안, 미확정)**: 2-b 검색 결과가 0건이면(관련 공지 없음, 3절 기존
  `noticesText`의 "(관련 공지 없음)" 분기와 동일 조건) `event: citations` 이벤트를
  `data: []`(빈 배열)로 보낸다 — 이벤트 자체를 생략하지 않는다(제안, 채택 — 프런트가 항상
  같은 이벤트를 기다리면 되므로 "이벤트가 없으면 아직 안 왔다 vs 원래 없다"를 구분할 필요가
  없어진다, YAGNI에 부합).
- **테스트 방법(제안)**: 목 DeepSeek 스트림으로 `POST /api/chat` 통합 테스트 시, 응답 스트림을
  파싱해 `event: citations` 블록이 DeepSeek 청크보다 먼저 오는지, JSON 배열 각 원소가
  `id/title/source_url/posted_at` 키를 갖는지 확인. 숨김 처리된(`hidden_at` not null)
  공지가 RAG 검색 픽스처에 섞여 있어도 인용 목록에 나오지 않는지 확인(2-b 쿼리 조건
  검증). 관련 공지가 0건인 픽스처로 호출 시 `data: []`가 오는지(이벤트 생략이 아닌지)
  확인. 같은 `notice_id`의 청크 2개가 RAG 결과에 함께 뽑히는 픽스처로 인용 목록에 그
  `notice_id`가 1건만 남는지(중복 제거) 확인.

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
- 모델 교체 절차는 [[anyang-database-schema#notice_chunks — 벡터 검색용]]의
  재임베딩 절차를 따른다.

### 5. 공지 수집기 (Collector)

- 대상 게시판 URL: **확정** — 안양시 청년 게시판 1개
  (https://www.anyang.go.kr/youth/selectBbsNttList.do?bbsNo=1184&key=3543,
  [[anyang-service-scope]], user, 2026-09-27).
- **robots.txt 준수 확인 — 확인됨(2026-09-28, 메인 세션 확인)**:
  `https://www.anyang.go.kr/robots.txt`는 404 — 제한 없음으로 처리한다(구현에 반영됨,
  `web/lib/collector.ts`).
- **게시판 HTML 구조 — 확인됨(2026-09-28, 메인 세션 확인, 커밋 766ea20에서 구현·테스트됨,
  출처: [[2026-09-28_anyang-first-build-paused]] "다음 할 일" 3번)**. 구조가 바뀌면 파서를
  갱신한다.
  - 목록: `table.p-table tbody tr` → `td.p-subject a`가 제목·상대 href(예:
    `./selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=<n>&...`, `&amp;` 디코드 필요), 마지막
    `td`의 `<time>`이 게시일(YYYY-MM-DD). 고유키는 `nttNo`.
  - 상세: 제목 `span.p-table__subject_text`, 본문 `td.p-table__content`, 첨부
    `ul.p-attach a.p-attach__link`. 상세 페이지에는 게시일이 없으므로 목록에서 읽은 값을 쓴다.
  - 인코딩은 UTF-8.
- 흐름(파서 부분 확인됨, 나머지 미확정 표시 유지):
  1. robots.txt 404(제한 없음) 확인을 거쳐 수집을 실행한다.
  2. `robots.txt`에 `Crawl-delay`가 없으므로 기본 요청 간격 2초(제안, 미확정)를 요청 사이에
     둔다.
  3. 목록 페이지 → 상세 페이지 순으로 위 확인된 셀렉터로 HTML을 파싱한다(파서 라이브러리는
     `cheerio`, 구현됨).
  4. `content_hash`(제목+본문 해시, 미확정)로 기존 공지와 비교해 신규/변경분만 저장.
  5. 신규/변경 공지는 임베딩 파이프라인 큐에 등록(4번 참고).
- User-Agent에 연락 가능한 식별 문자열을 남긴다(제안, 미확정 — 예: 서비스명 + 문의 이메일).
- **공지 숨김 처리 방식 — 쿼리 조건 채택(제안)**: [[anyang-database-schema#notices
 ]]이 제시한 두 방식 중 1번(쿼리 조건)을 기본안으로 채택한다 — 스키마 변경 없이
  애플리케이션 책임으로 끝나고, 숨김 해제 시 재임베딩 비용이 없다(YAGNI, 물리 삭제는 되돌리기
  비용만 크고 이득이 없다). `/api/notices/recommended`, `/api/notices/:id`, 채팅 RAG 검색
  (3절), notify-job 매칭(7절) 등 `notices`/`notice_chunks`를 조회하는 모든 지점에서
  `notices.hidden_at is null` 조건을 공통 쿼리 헬퍼에 넣어 빠뜨리지 않게 한다(제안, 미확정 —
  헬퍼 함수명·위치는 구현 단계에서 정함).

### 6. 임베딩 파이프라인

- 트리거: `POST /api/jobs/embed` — 스케줄러(7번)가 호출.
- 동작: `notice_chunks`/`user_preferences` 중 `embedding IS NULL`인 행을 조회 → Gemini
  임베딩 호출(4번 재시도 규칙 적용) → 결과 저장.
- 청크 분할 여부: 미확정([[anyang-database-schema#notice_chunks — 벡터 검색용]]
  참고). 공지 본문이 길면(임계값 미확정) 분할, 짧으면 통째로 1개 청크.

### 7. 스케줄러 — 수집 잡 / 알림 잡

이전 가능성 원칙에 따라 잡 로직은 앱 API 엔드포인트에, 트리거는 pg_cron+pg_net(클라우드)
또는 리눅스 cron+curl(UNO Q, 12절 runbook)로 교체 가능하게 둔다.

| 엔드포인트 | 설명 | 트리거 주기 |
|---|---|---|
| `POST /api/jobs/collect` | 공지 수집기(5절) 실행 | 하루 1회(미확정 제안, database 제안과 같은 시각 — Asia/Seoul 04:00, [[anyang-database-schema#pg_cron / pg_net 잡 정의]]) |
| `POST /api/jobs/embed` | 임베딩 파이프라인(6절) 실행 | 미확정, 제안: 수집 잡 직후 |
| `POST /api/jobs/notify` | 알림 시각이 된 사용자에게 새 공지 매칭·푸시 | 미확정, [[anyang-database-schema]] 제안 5분 |

- **공유 시크릿 인증(제안, 미확정)**: 요청 헤더 `x-scheduler-secret`을 환경변수
  `SCHEDULER_SHARED_SECRET` 값과 상수 시간 비교(`crypto.timingSafeEqual`, 미확정 구현
  방식). 불일치 시 401. 값은 문서에 남기지 않는다(dev-common 규칙 9).
- **알림 시각 정밀도(제안, 미확정)** — pg_cron 트리거 주기 5분 전제
  ([[anyang-database-schema#pg_cron / pg_net 잡 정의]]): pg_cron은 지정한 크론
  표현식 그대로(예: `*/5 * * * *`) 정확히 실행되므로(Vercel Cron처럼 1시간 창 안 임의
  시점이 아니다), `/api/jobs/notify`는 "직전 실행 이후 지금까지" 창을 본다 — Asia/Seoul
  기준 `notify_time`이 `(현재 시각 - 5분, 현재 시각]` 범위에 들어오는 `enabled=true`
  사용자를 고른다. 이렇게 하면 사용자가 어떤 분을 고르든 늦어도 5분 안에 그 시각을 창이
  지나간다. **자정 경계 처리를 포함한 실제 쿼리는 여기서 다시 적지 않고**
  [[anyang-database-schema#pg_cron / pg_net 잡 정의]]의 대상 사용자 선정 쿼리를
  그대로 쓴다(`notify_time + 5분`이 자정을 넘는 경우를 OR로 분기 처리한 SQL, database가
  이미 작성해뒀다 — 값을 복제하면 한쪽만 고쳐질 위험이 있어 링크로 대체).
  - **중복 발송 방지 — `notify_logs` pending 2단계 채택(제안, database 조율 완료)**:
    database가 확정한 `notify_logs` 구조([[anyang-database-schema#notify_logs
   ]] — `reserved_at`/`sent_at`/`result`(`pending`/`success`/`failed`))를 그대로
    쓴다. 흐름: 매칭된 (사용자, 공지) 쌍마다
    1. `INSERT INTO notify_logs (user_id, notice_id, result) VALUES ($1, $2, 'pending')
       ON CONFLICT (user_id, notice_id) DO NOTHING`으로 먼저 선점한다.
    2. 실제로 삽입된 경우(영향 받은 행 수 1)에만 Web Push를 전송한다. 삽입 안 됐으면(이미
       선점된 조합) 3번의 "정체된 pending 재시도" 판단으로 넘어간다.
    3. 전송 결과에 따라 `UPDATE notify_logs SET result = 'success' | 'failed', sent_at =
       now(), error_summary = ... WHERE user_id = $1 AND notice_id = $2`로 갱신한다.
    - **정체된 `pending` 재시도(제안, 미확정 — 프로젝트 문서 확인 항목 17 후속)**: 함수가
      전송 도중 중단되면 `result='pending'`인 채로 영영 남아 그 사용자는 해당 공지 알림을
      영구히 못 받는다. 이를 막기 위해 2번에서 삽입이 안 된(이미 있던) 조합을 만나면 기존
      행의 `reserved_at`을 확인한다 — 잡 트리거 주기(제안 5분)의 2배인 10분(제안, 미확정)
      보다 오래된 `pending` 행은 정체된 것으로 보고, `UPDATE notify_logs SET reserved_at =
      now() WHERE user_id = $1 AND notice_id = $2 AND result = 'pending' AND reserved_at <
      now() - interval '10 minutes'`로 재선점(영향 받은 행 수 1이면 재선점 성공)한 뒤 다시
      전송을 시도하고 3번과 같이 갱신한다. `result`가 이미 `success`/`failed`인 행은 이
      재시도 대상이 아니다(그대로 건너뜀 — `failed` 재시도는 이번 스콥에서 만들지 않는다,
      YAGNI 유지).
    - 이렇게 하면 잡이 재시도되거나 실행이 겹쳐도 DB 유니크 제약으로 중복 발송이 막히고,
      프로세스 중단으로 인한 `pending` 장기 잔류도 다음 실행에서 스스로 복구된다(프로젝트
      문서 확인 항목 17 해결에 반영).
  - `timezone` 컬럼은 항상 `'Asia/Seoul'` 고정([[anyang-database-schema#notify_settings
    (미확정 — 컬럼 타입은 설계 승인 전, 항목 범위·시간대는 확정)]]).
- `/api/jobs/notify` 매칭 로직(제안, 미확정): 위 시각 창에 든 사용자마다, 후보 공지를 다음
  두 조건으로 좁힌 뒤 Web Push 전송(8절) 여부를 정한다.
  1. **알림 대상 공지 범위(제안, database 제안 채택 — 2차 재점검 반영: null 처리 변경)**:
     `notices.collected_at > notify_settings.enabled_at` — 사용자가 알림을 켠(또는 다시 켠)
     시각 이후 수집된 공지만 대상으로 한다([[anyang-database-schema#notify_settings (미확정
     — 컬럼 타입은 설계 승인 전, 항목 범위·시간대는 확정)]]). 2-2절에 따라 `enabled_at`은
     가입·온보딩 시 항상 채워지므로, `enabled_at`이 null인 행은 이 컬럼 도입 전에 만들어진
     레거시 행뿐이다 — 이 경우 **발송 대상에서 제외한다**(database 문서와 동일한 결정,
     이전 draft의 "조건을 적용하지 않는다(포함)"는 폐기). 이렇게 과거에 쌓인 공지가 알림을
     켜자마자 한꺼번에 발송되는 것을 막는다.
  2. **유사도 임계값**: 1번을 통과한 공지 중 **`notice_chunks` 벡터와 사용자
     `user_preferences.embedding`(선호) 벡터**의 코사인 유사도가 임계값(미확정, 제안 0.75)
     이상인 것만 고른다. **프로필은 임베딩하지 않으므로**([[anyang-ai-models-data-transfer]]
     확정) 이 계산에 들어가지 않는다 — 프로필 조건은 채팅(3절)에서만 DeepSeek 프롬프트
     조건으로 쓰인다. `user_preferences`가 없는 사용자는 유사도 계산 대상이 없으므로 이
     잡에서는 매칭되는 공지가 없다(제안 — 2-1절 추천 피드와 달리 알림은 최신순 대체를
     두지 않는다. 선호 없이 무작위로 푸시를 보내면 오히려 사용자 경험을 해친다는 판단).
  **판정은 코사인 유사도 임계값(결정적 계산)만 쓰고 LLM을 쓰지 않는다** — 반복 판단이지만
  정규식/산술로 결정적으로 풀리므로 dev-common Jev 제외 조건에 해당해 Jev 도입 대상이
  아니다.
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
- 라이브러리는 표준 `web-push`(npm, Node 표준 Web Push 구현) 사용 제안.

### 9. 환경변수 목록

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | PostgreSQL 접속(표준, 이전 가능성 원칙 1) |
| `AUTH_SECRET` | Auth.js JWT 서명 키 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `DEEPSEEK_API_KEY` | DeepSeek API |
| `GEMINI_API_KEY` | Gemini 임베딩 API |
| `SCHEDULER_SHARED_SECRET` | pg_net/cron → 앱 API 호출 인증 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |
| `APP_ORIGIN` | 배포 origin. 커스텀 도메인을 붙이기 전까지는 Vercel 기본 도메인, 붙인 뒤에는 그 도메인(OAuth 리다이렉트, VAPID subject, 푸시에 사용) |
| `ADMIN_EMAILS` | 관리자 이메일 목록(쉼표 구분, 예: `a@x.com,b@y.com`). 13절 `/api/admin/*` 인가에만 쓴다. DB 역할 컬럼 없음([[anyang-service-scope]] 확정) |

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
9. 전환 후 Google OAuth 콘솔의 승인된 리다이렉트 URI가 `APP_ORIGIN` 기준이라, 전환 후에도
   같은 도메인을 그대로 쓰면(원칙 5 — 커스텀 도메인은 배포 시점에 붙여 이후 환경 전환과
   무관하게 유지) 리다이렉트 URI 변경이 불필요하다. 도메인 자체를 바꾸는 경우는 12-1절 절차를
   따른다.

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

### 13. 관리자 API (`/api/admin/*`) — 제안, 미확정

관리자 지정·기능 범위·"대화·기억 원문 비노출" 원칙은 확정
([[anyang-service-scope]], user, 2026-09-27). 아래 엔드포인트·응답 필드·구현 방식은 제안이며
``이다.

#### 13-0. 공통 인가

- 공통 헬퍼(제안, 미확정 이름: `requireAdmin(request)`)를 모든 `/api/admin/*` 핸들러
  맨 앞에서 호출한다. 로그인 세션이 없으면 401을 반환한다.
- **관리자 판정은 이번 세션의 로그인 방식(JWT provider claim)으로만 한다(제안, 채택 —
  2차 재점검 반영: `accounts` 테이블 조회 방식 폐기)**: 세션 이메일을 `ADMIN_EMAILS`와
  비교하기 전에, 그 이메일·비밀번호(Credentials) 가입 계정은 이메일 인증이 없어(1-1절) 타인의
  이메일 주소로 가입할 수 있으므로 먼저 **이번 로그인의 provider**를 확인한다. Auth.js
  `jwt` 콜백에서 로그인 provider(`account.provider`, 예: `'google'`/`'credentials'`)를 JWT
  클레임(`token.provider`, 미확정 이름)에 기록하고 `session` 콜백에서 세션 객체로 넘긴다.
  `requireAdmin`은 세션의 `provider === 'google'`일 때만 다음 단계로 넘어가 세션 이메일이
  `ADMIN_EMAILS`(쉼표로 분리한 목록, 대소문자 무시 비교, 제안)에 있는지 비교한다 — 없으면
  403(`ADMIN_ONLY`)을, 있으면 통과시킨다. `provider`가 `'credentials'`(또는 그 외)이면
  세션 이메일이 `ADMIN_EMAILS`에 있어도 즉시 403(`ADMIN_ONLY`, 1-4절)이다 — 로그인 방식을
  먼저 걸러야 이메일만으로는 관리자를 사칭할 수 없다
  (관리자 API 존재 자체를 숨기는 404 방식도 검토했으나, 이 서비스는 공개 attack surface가
  아니고 403이 더 단순하며 클라이언트 에러 처리도 쉬워 403을 기본안으로 택한다 — YAGNI,
  1-4절과 동일 결정).
  - **왜 `accounts` 조회 대신 JWT 클레임인가(제안)**: 세션이 이미 이번 로그인의 provider
    정보를 갖고 있으므로, 매 관리자 요청마다 `accounts` 테이블을 다시 조회할 필요가 없다
    (YAGNI — 요청당 DB 왕복 1회를 없앤다). 과거에 Google로 가입했던 계정이라도 이번 세션이
    Credentials로 로그인했다면(예: 같은 계정에 두 provider가 있는 경우) 이번 로그인 방식을
    기준으로 판정하는 것이 "지금 이 요청이 실제로 어떻게 인증됐는가"에 더 부합한다.
  - **가입 시점 차단(신규, 제안, 미확정)**: `POST /api/auth/register`(이메일·비밀번호 가입)에서
    요청 email이 `ADMIN_EMAILS`에 있으면 계정 생성 자체를 403(에러 코드 `ADMIN_EMAIL_RESERVED`
    제안, 미확정 — 1-4절 표에 추가 필요)으로 거부한다. 이 비교도 위 649행의 관리자 판정과
    동일하게 대소문자 무시·앞뒤 공백 제거 후 비교한다(제안). 관리자 이메일은 Google 로그인으로만
    가입하게 강제해, 그 이메일로 비밀번호 계정을 먼저 만들어 관리자를 사칭하는 경로 자체를
    없앤다. 1-5절의 이메일 충돌 문제와 같은 종류의 방어다.
- `ADMIN_EMAILS` 값은 매 요청 `process.env`에서 읽는다(별도 캐싱 없음, 배포당 값이 바뀌지
  않으므로 과설계 방지).
- 관리자 화면 API 응답에는 어떤 엔드포인트에서도 `messages.content`, `user_preferences.
  preference_text` 등 대화·기억 원문을 포함하지 않는다(확정 원칙, 이 문서 전체에 적용).

#### 13-1. 공지 수집 관리

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/collect-runs` | `collect_runs` 목록(최신순, 페이지네이션 미확정) |
| POST | `/api/admin/collect-runs` | 수동 수집 실행 |
| GET | `/api/admin/notices` | 공지 목록(숨김 포함, 페이지네이션) — 신규(확인 항목 23) |
| PATCH | `/api/admin/notices/:id/hide` | 공지 숨김. body `{ hidden_reason? }` |
| PATCH | `/api/admin/notices/:id/unhide` | 공지 숨김 해제 |

- `POST /api/admin/collect-runs`는 5절 수집기 로직을 `trigger_type='manual'`,
  `triggered_by=<관리자 user_id>`로 동기 실행한다(제안, 미확정). Vercel Fluid Compute 함수
  한도(300초, 11절)를 넘기지 않는다는 전제 — 게시판 1개, 신규/변경분만 저장하는 구조라 매
  실행이 300초를 넘길 가능성은 낮다고 판단(YAGNI, 별도 잡 큐를 두지 않는다). 실행이 오래
  걸리는 경우가 실제로 생기면 그때 비동기 큐 도입을 재검토한다(설계 변경 대상).
- **`GET /api/admin/notices` (신규, 제안, 미확정 — 확인 항목 23 반영)**: 관리자 공지 목록
  화면([[anyang-frontend-screens#11. 공지 수집 관리 (`/admin/collect-runs`, 미확정)]])이
  공지를 숨김/해제하려면 먼저 전체 목록(숨김 포함)을 봐야 하는데, 기존에는 조회 API가
  없었다. 필요한 컬럼(`id`, `title`, `source_url`, `published_at`, `collected_at`,
  `hidden_at`, `hidden_reason`)은 이미
  [[anyang-database-schema#notices — 공지 자격요건 구조화 컬럼 없음(확정)]]에 있어
  **스키마 변경 없이** 이 API를 만들 수 있다(database 문서 확인 완료, 이번 세션에서 스키마
  변경 요청 없음).
  - 쿼리 파라미터(제안, 미확정): `page`(1부터 시작, 기본 1), `page_size`(기본 20, 최대
    100 — 다른 관리자 목록과 별도 상한을 둘 이유가 없어 13-3절 사용자 목록과 같은 관례를
    따른다, 제안). 숨김 여부로 걸러 보고 싶을 수 있어 `hidden`(선택, `true`/`false`/생략 —
    생략 시 전체) 파라미터도 둔다(제안, 미확정 — 필터 없이 전체를 다 내려도 되지만 관리자가
    "숨김만" 또는 "정상만" 보고 싶을 수 있어 추가, YAGNI에 크게 위배되지 않는 선에서 쿼리
    파라미터 1개 추가).
  - 정렬(제안, 미확정): `collected_at desc`(최신 수집순 고정, 정렬 기준 선택 파라미터는
    두지 않는다 — 다른 관리자 목록도 정렬 옵션이 없다, YAGNI).
  - 응답(제안, 미확정): `{ items: [{ id, title, source_url, published_at, collected_at,
    hidden_at, hidden_reason }], page, page_size, total_count }`. `total_count`는
    `count(*)` 별도 쿼리(제안 — 다른 관리자 목록 페이지네이션과 같은 관례가 아직 이
    문서에 없어 새로 정한다, 페이지네이션이 미확정인 `collect-runs`와 달리 이 API는
    프런트가 "전체 몇 건" 표시를 요구할 수 있다고 보고 포함, 미확정이면 frontend 조율
    시 제외 가능).
  - 에러 코드: 인증 없음 401, 관리자 아님 403(`ADMIN_ONLY`, 13-0절과 동일), `page`/
    `page_size`가 숫자가 아니거나 범위를 벗어나면 400(제안, 미확정 — 메시지 형식은
    다른 400과 동일하게 `{ error: "INVALID_REQUEST" }`, 3절 기존 관례 재사용).
  - 인가: 13-0절 `requireAdmin` 그대로 재사용(제안 — 새 인가 규칙을 만들지 않는다, YAGNI).
  - 테스트 방법(제안): 숨김/정상 공지가 섞인 픽스처로 호출 시 `hidden` 파라미터 없이는
    둘 다, `hidden=true`면 숨김만, `hidden=false`면 정상만 나오는지 확인. `page_size`
    범위를 벗어난 값(0, 101)으로 호출 시 400 확인. 관리자 아닌 로그인 사용자 403,
    비로그인 401 확인(13-0절 관례와 동일 방식으로 자동 검증).
- `PATCH .../hide`, `.../unhide`는 [[anyang-database-schema#notices]]의
  `hidden_at`/`hidden_reason`을 갱신한다. 숨김 처리는 5절에서 채택한 쿼리 조건 방식을 따른다
  (물리 삭제 없음).
- 인증 필요(13-0), 관리자만.

#### 13-2. 알림 발송 현황

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/notify-logs/summary` | 날짜별 발송·실패 수 + 구독 수 |

- 쿼리 파라미터: `from`, `to`(날짜 범위, 기본값 최근 30일 제안).
- 응답(제안, 미확정): `{ daily: [{ day, success_count, failed_count }], notify_enabled_count,
  push_device_count }`. `daily`는
  [[anyang-database-schema#notify_logs]]의 집계 쿼리 예시를 그대로 쓴다.
- **"구독 수" 집계 기준(제안, 채택)**: database가 제기한 미확정 질문(두 지표 중 택1)을
  "둘 다 반환"으로 해소한다 — `notify_enabled_count`는 `notify_settings.enabled=true`
  행 수(서비스 관점 "알림 받기로 설정한 사용자 수"), `push_device_count`는
  `push_subscriptions` 행 수(등록된 브라우저/기기 수, 사용자 1명이 여러 기기를 등록할 수
  있어 사용자 수와 다를 수 있음). 두 값 다 단순 COUNT라 계산 비용이 낮아 하나만 고르는 대신
  둘 다 보여주는 쪽이 관리자에게 더 정확한 그림을 준다(YAGNI에 위배되지 않음 — 추가 로직
  없이 쿼리 하나 더).
- 인증 필요(13-0), 관리자만.

#### 13-3. 사용자 관리·통계

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/users` | 사용자 목록(페이지네이션) |
| GET | `/api/admin/stats` | 가입자 수, 연령대·직군·재학재직 집계 |
| PATCH | `/api/admin/users/:id/suspend` | 계정 정지 |
| PATCH | `/api/admin/users/:id/unsuspend` | 정지 해제 |
| DELETE | `/api/admin/users/:id` | 계정 삭제 |

- `GET /api/admin/users` 응답 필드 최소화(제안, 미확정): `{ id, email, created_at,
  suspended_at }`만 반환한다. `name`, 프로필 상세(생년·성별·직군), 대화·기억 관련 필드는
  목록에 넣지 않는다 — 정지/삭제 조작에는 `id`만 있으면 되고, 계정 식별에는 `email`이
  필요하다고 판단(그 이상은 "개인별 통계 노출 최소화" 원칙에 어긋남). 프로필 집계는
  `/api/admin/stats`에서 개인 식별 없이 개수로만 제공한다.
- `GET /api/admin/stats` 응답(제안, 미확정): `{ total_users, by_birth_decade: [{ decade,
  count }], by_occupation_type: [{ occupation_type, count }], by_enrollment_status:
  [{ enrollment_status, count }] }`.
  [[anyang-database-schema#연령대·직군 집계 쿼리 예시 (제안) — 관리자 화면 "사용자 관리·통계"용]]
  쿼리를 그대로 쓴다. 개인별 행이 아니라 집계 개수만 반환하므로 원문 비노출 원칙과 충돌하지
  않는다.
- `PATCH .../suspend`, `.../unsuspend`는 `users.suspended_at`을 갱신한다. 1-2절의 정지
  차단 방식이 이 값을 기준으로 동작한다.
- `DELETE /api/admin/users/:id`는 1-3절 "사용자 탈퇴 API"와 **같은 2단계 처리 순서**를
  따른다(제안) — 관리자가 대신 탈퇴시키는 것이므로 삭제 방식이 같아야 한다.
  1. `UPDATE consents SET withdrawn_at = now() WHERE user_id = $1 AND withdrawn_at IS NULL`
  2. `DELETE FROM users WHERE id = $1` — [[anyang-database-schema#users]]의
     cascade 정책에 따라 profiles/accounts/credentials/conversations/push_subscriptions/
     notify_settings/user_preferences가 함께 삭제된다. `consents`는 `on delete set null`
     이므로 1번에서 `withdrawn_at`을 채운 행이 삭제되지 않고 `user_id`만 null이 된다(증빙
     보관, [[anyang-service-scope]] 확정 — 즉시 삭제 아님). 이전 draft의 "cascade로 함께
     삭제"라는 설명은 `consents`에는 더 이상 해당하지 않는다.
  이 삭제는 관리자 화면의 정식 기능(사용자 삭제 버튼)이지 dev-common 3조("파일 삭제는
  사용자 승인 후")가 말하는 에이전트의 임의 삭제 작업이 아니므로 별도 세션 내 승인 절차는
  없다 — 프런트에서 확인 다이얼로그를 두는 것으로 충분하다(제안, frontend 소관).
- 인증 필요(13-0), 관리자만.

#### 13-4. 외부 API 사용량

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/api-usage/summary` | 제공자별 호출 수·오류·토큰, 무료 한도 대비 사용량 |

- 쿼리 파라미터: `from`, `to`(기본값 오늘, database 집계 쿼리 예시와 동일 범위 제안).
- 응답(제안, 미확정): `{ providers: [{ provider, day, success_count, rate_limited_count,
  error_count, input_tokens, output_tokens, limit_note }] }`.
  [[anyang-database-schema#api_usage_logs]]의 집계 쿼리를 그대로 쓴다.
- **무료 한도 값의 출처**: 이 문서 11절 "공식 문서로 확인한 수치" 표를 그대로 링크한다(값을
  이 절에 다시 옮겨 적지 않는다 — 두 곳에 있으면 한쪽만 고쳐져 어긋난다는 규칙). Gemini
  임베딩은 RPD 한도(약 1,000/일)가 있어 `limit_note`에 "오늘 사용량 / 1000"처럼 계산해
  넣는다(제안, 미확정 상수: 코드 내 `GEMINI_FREE_TIER_RPD = 1000` 등, DB에 두지 않음).
  DeepSeek는 RPM이 아니라 동시성 제한이라 "무료 한도 대비 %"로 표현할 지표가 없으므로
  `limit_note`는 DeepSeek 행에는 null(제안) — 억지로 비율을 만들지 않는다(YAGNI).
- 인증 필요(13-0), 관리자만.

## 테스트 방법

- **인증·동의**: Google OAuth 로그인 성공 시 `users` 행 생성/재사용 확인. Credentials 가입 →
  `credentials.password_hash`가 평문이 아닌지 확인. 잘못된 비밀번호로 로그인 시 401.
  두 동의 항목(`collection_use`, `overseas_transfer`) 중 하나라도 `false`(또는 누락)로
  회원가입 시도 시 400, `consents` 행이 생기지 않는지 확인. 가입 성공 시 `consents` 행이
  **2개**(항목별 1개씩) 생기는지 확인. `POLICY_VERSION` 코드 상수를 올린 뒤 옛
  `policy_version`으로만 동의한 사용자로 인증 필요 API를 호출하면 403(재동의 필요)이 오는지,
  `POST /api/auth/consent`로 재동의하면 그 뒤 정상 호출되는지 확인. 비밀번호 재설정
  엔드포인트는 만들지 않으므로 `POST /api/auth/forgot-password` 등 경로가 404/미존재인지
  확인(제외 확정 반영).
- **탈퇴**: `DELETE /api/account` 호출 후 `users` 행이 삭제되고, 해당 사용자의 `consents`
  행은 삭제되지 않은 채 `user_id`가 null·`withdrawn_at`이 채워졌는지 확인. `DELETE
  /api/admin/users/:id`도 같은 결과인지 확인. 재동의가 필요한 옛 `policy_version`
  상태이거나 `suspended_at`이 채워진 계정도 `DELETE /api/account` 호출이 403 없이 성공하는지
  확인(1절·1-2절 예외 경로 테스트).
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
  키 존재 여부 assert) — 데이터 최소화 원칙의 자동 검증. 전화번호·이메일·주민등록번호 형태를
  포함한 사용자 메시지로 DeepSeek·Gemini 호출을 각각 목으로 캡처해, 두 전송 payload 모두
  가림 처리 후 문자열이 전달되는지 확인(정규식 가림 자동 검증 — 한 곳만 확인하지 않는다).
  선호 추출 결과 문장에 전화번호 등이 포함된 픽스처로 Gemini 임베딩 호출을 캡처해 가림
  처리가 적용됐는지도 함께 확인.
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
- **관리자 API 인가**: `ADMIN_EMAILS`에 없는 로그인 사용자가 `/api/admin/*` 아무 엔드포인트나
  호출 시 403(`ADMIN_ONLY`), 비로그인 401 확인. `ADMIN_EMAILS`에 있고 **Google 로그인**한
  사용자는 200 확인. `ADMIN_EMAILS`에 있지만 **Credentials(이메일·비밀번호)로 가입/로그인한**
  사용자는 이메일이 일치해도 403(`ADMIN_ONLY`)인지 확인(관리자 사칭 방지 테스트).
- **관리자 API 원문 비노출**: `/api/admin/users`, `/api/admin/stats`,
  `/api/admin/notify-logs/summary`, `/api/admin/api-usage/summary` 응답 payload를 캡처해
  `messages`/`user_preferences.preference_text` 등 대화·기억 원문 필드가 섞여 있지 않은지
  키 존재 여부로 자동 검증(3절 데이터 최소화 테스트와 같은 방식).
- **정지 계정 제한**: `suspend` 후에도 로그인이 성공하고 세션에 `suspended: true`가 포함되는지
  확인. 정지 상태에서 `DELETE /api/account`와 로그아웃은 성공하고, 그 외 인증 필요 API
  호출은 403(`ACCOUNT_SUSPENDED`)인지 확인(접근 차단은 매 요청 DB 조회 미들웨어가 판정하므로
  `unsuspend` 직후 바로 정상 동작해야 한다 — `session.suspended` 필드 자체는 안내 화면
  표시용이라 다음 로그인/토큰 갱신 전까지 값이 지연될 수 있음을 감안해 미들웨어 결과로만
  판정한다).
- **공지 숨김**: `hide` 후 `/api/notices/recommended`·채팅 RAG 검색 결과에 해당 공지가 빠지는지
  확인. `unhide` 후 다시 나오는지 확인.
- **채팅 인용 공지 스트림(3-2절, 확인 항목 22)**: 위 "채팅" 항목의 페이로드 캡처 테스트에
  더해, `event: citations` 블록이 DeepSeek 청크보다 먼저 오는지·JSON 배열 원소가
  `id/title/source_url/posted_at` 키를 갖는지·숨김 공지가 섞인 RAG 픽스처에서도 인용
  목록에 나오지 않는지·관련 공지 0건일 때 `data: []`가 오는지·같은 `notice_id` 청크
  중복이 인용 목록에서 1건으로 합쳐지는지 확인(3-2절 테스트 방법과 동일, 여기서는 목록만
  참조).
- **관리자 공지 목록(확인 항목 23)**: `GET /api/admin/notices`가 `hidden` 파라미터로
  숨김/정상을 필터링하는지, `page_size` 범위를 벗어나면 400인지, 관리자 아님 403·비로그인
  401인지 확인(13-1절 테스트 방법과 동일, 여기서는 목록만 참조).
- **알림 중복 발송 방지 + pending 선점(`notify_logs`)**: 같은 (user_id, notice_id) 쌍으로
  `INSERT ... ON CONFLICT DO NOTHING`을 두 번 실행해 첫 번째만 `pending` 행을 만들고 두
  번째는 삽입되지 않는지(전송을 건너뛰는지) 확인. 전송 후 `UPDATE`로 `success`/`failed`가
  정상 반영되는지 확인. `reserved_at`을 10분 이전으로 조작한 `pending` 테스트 행을 만든 뒤
  재선점(`UPDATE ... WHERE reserved_at < now() - interval '10 minutes'`)이 성공하고 전송이
  재시도되는지 확인. `success`/`failed` 행은 이 재선점 대상이 아닌지도 확인.
- **수동 수집 실행**: `POST /api/admin/collect-runs` 호출 시 `collect_runs`에
  `trigger_type='manual'`, `triggered_by=<관리자 id>` 행이 생기고 응답이 300초 안에
  오는지(목 서버로 짧게) 확인.
- **api_usage_logs 기록**: DeepSeek·Gemini 호출을 목으로 성공/429/오류 각각 재현해
  `api_usage_logs`에 대응하는 `status` 값으로 1행씩 남는지 확인.

## 확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)

- 수집 대상 게시판(확정 URL)의 `robots.txt` 준수 확인과 실제 HTML 구조 확인 — 이 세션에는
  웹 접근 도구가 없어 구현 착수 전 확인이 필요하다(5절). `Disallow`에 걸리면 설계 변경이
  필요하다.
- 비밀번호 재설정("비밀번호 찾기") — 해결(2026-09-27, user): 1차 출시 제외, Google 로그인
  대체 안내(1-1절). 관련 엔드포인트·이메일 발송 인프라 없음.
- 알림 잡 중복 발송 방지 — 해결(2026-09-27, database 확정 + backend 채택): `notify_logs`의
  `unique(user_id, notice_id)` + `pending`→`success`/`failed` 2단계 흐름(7절). 정체된
  `pending` 재시도 임계값(제안 10분)은 backend 제안값이며이다.
- 공지 자격요건을 `notices`의 구조화 컬럼으로 둘지 — 1차 출시에서 만들지 않는다(확정,
  [[anyang-service-scope]], user, 2026-09-27). 게시판 구조 확인 후에도 이번 스콥에서는
  재검토하지 않는다.
- UNO Q 전환 시 HTTPS 확보 방법(리버스 프록시/터널, 12절 7번) — 이 설계 범위 밖 별도 조사 필요.
- 동의 항목 분리·재동의 강제·탈퇴 시 보관 — 해결(2026-09-27, user): 수집·이용/국외 이전
  분리(둘 다 필수), 처리방침 개정 시 재동의 강제, 탈퇴 시 즉시 삭제 아님·보관 후 삭제(1절,
  1-3절). `POLICY_VERSION` 코드 상수 위치(`lib/consent.ts` 등, 미확정 정확한 경로)와
  재동의 판정 위치(공통 미들웨어, 1절)는 backend 제안이며 설계 승인으로 확정된다.
- **동의 기록 보관 기간(숫자) — 해결(2026-09-27, user)**: 1년으로 확정됐다
  ([[anyang-service-scope]], [[anyang-database-schema#consents — 가입 시 개인정보
  필수 동의 기록]]). 로그 테이블(90일)보다 긴 것은 `consents`가 법적 증빙 목적이기 때문이다.
  보관 만료분 정리 잡(`delete from consents where withdrawn_at < now() - interval '1
  year'`) 자체는 되돌릴 수 없는 삭제이므로, 실제 pg_cron 등록은 구현 단계 지시서에 이 잡
  등록에 대한 별도 사용자 승인이 적혀 있어야 한다([[anyang-backend-tasks]] 16번 작업 참고).
- 로그 정리 잡(`collect_runs`/`api_usage_logs` 90일) 등록 — 해결(2026-09-27, user): 보존
  기간·등록 자체는 승인됨. 실제 pg_cron 등록은 database 소관 SQL이라 이 문서에 API
  엔드포인트는 없다. [[anyang-backend-tasks]]에 구현 단계 작업 단위로 등록해, 구현 착수
  지시서에 이 잡 실행에 대한 별도 승인이 적혀 있는지 확인하는 절차를 명시했다.
- **이메일 계정 연결 정책(1-5절, 신규)** — backend 제안(자동 연결 off 유지 + 안내 메시지 +
  관리자 수동 삭제 경로)을 기본안으로 채택했다. 이메일 인증이 없는 구조적 한계상 완전한
  해결책은 없다고 판단해 블로킹 질문으로 올리지 않았으나, 설계 승인 시 이 기본안 자체에
  이견이 없는지 확인이 필요하다.
- **채팅 인용 공지 스트림(3-2절, 확인 항목 22)** — 이벤트 형식(`event: citations`)·전송
  시점·중복 제거·빈 목록 처리는 backend 제안이며 ``이다. frontend가 이 형식으로
  파싱 가능한지는 다음 조율 차례에 확인이 필요하다(이번 호출 범위 밖 — frontend 조율은
  이번 지시서에서 요청받지 않았다).
- **관리자 공지 목록(13-1절, 확인 항목 23)** — `GET /api/admin/notices`는 기존 스키마
  ([[anyang-database-schema#notices — 공지 자격요건 구조화 컬럼 없음(확정)]])로 구현
  가능하다(스키마 변경 불필요, database 재조율 없이 진행). 쿼리 파라미터·응답 필드·
  `total_count` 포함 여부는 backend 제안이며 ``이다.

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
- [[anyang-preferences-put-missing-mask-pii]]
