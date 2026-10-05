---
type: dev-task
date: 2026-10-05
status: active
owner: frontend
---

# 안양 청년정책 비서 — Frontend 구현 작업 단위

## Summary

[[anyang-frontend-screens]] 설계 승인 후 구현할 작업을 화면 단위로 나눈 목록이다. 각 단위는
독립적으로 테스트·커밋 가능하도록 쪼갰다(dev-common 규칙 4).

## Context

**2026-10-03 추가(확인 항목 52, draft)**: 청안 디자인 웹 적용 작업 C1~C10을 "청안 디자인 적용" 절에 추가했다([[anyang-cheongan-design-adoption]], [[anyang-frontend-screens]] "청안 디자인 적용 화면 스펙"). 1~15번 작업은 이미 구현된 것으로 그대로 두고, C 단위가 그 화면들의 외형·내비게이션을 바꾼다. 설계 재승인 전에는 구현하지 않는다.

의존: [[anyang-backend-api]]의 인증(동의 포함)·프로필·채팅·공지·알림설정·선호·히스토리·관리자
엔드포인트가 먼저 구현돼 있어야(또는 목/스텁으로라도) 해당 화면을 붙일 수 있다. 개인정보
동의 항목 분리(수집·이용/국외 이전 체크박스 2개)와 비밀번호 재설정 제외는
[[anyang-service-scope]]로 확정됐다(2026-09-27). 프로필 코드값 셋(`gender`,
`occupation_type`, `enrollment_status`)도 [[anyang-service-scope]] "프로필 선택지" 행(user,
2026-09-27)에서 확정됐다. `occupation_type`의 온보딩 입력 컴포넌트(select vs 라디오, 8개
선택지 때문에 나온 제안)는 설계 승인(2026-09-27)으로 네이티브 select로 확정됐다
([[anyang-frontend-screens#2. 온보딩 — 프로필 입력 (`/onboarding`)]]).

**2026-10-04 추가(확인 항목 55, draft)**: 공지 화면 시안 반영 작업 N1~N3을 "공지 화면 시안 반영" 절에 추가했다. 이미 구현된 C5(공지 목록·상세)에 대한 추가 작업이며 [[anyang-frontend-screens]] 공지 목록·상세 절(2026-10-04 개정)과 [[anyang-backend-api]]의 응답 필드 구현에 의존한다. 설계 재승인 전에는 구현하지 않는다.

**2026-10-04 추가(확인 항목 60, draft)**: 채팅 뒤로가기 시 대화·인용 유지 작업 S1~S3을 "채팅 뒤로가기 시 대화·인용 유지" 절에 추가했다. 이미 구현된 채팅 화면에 대한 추가 작업이며 [[anyang-frontend-screens]] 3-1절에 의존한다. 설계 재승인 전에는 구현하지 않는다.

**2026-10-04 추가(확인 항목 58, draft)**: 알림 설정 화면 테스트 알림 버튼 작업 T1~T3을 "테스트 알림 버튼" 절에 추가했다. 이미 구현된 알림 설정(C 단위)에 대한 추가 작업이며 [[anyang-frontend-screens]] 알림 절 "테스트 알림 보내기"·서비스워커 절과 [[anyang-backend-api#8-1. 테스트 알림 (신규, 2026-10-04, 확인 항목 58)]]에 의존한다.

**2026-10-05 추가(확인 항목 61, draft)**: 공지 화면 "관심사 보기" 시트 작업 V1~V4를 "공지 화면 관심사 시트" 절에 추가했다. 이미 구현된 공지 목록(C5)과 내 정보 기억 구역에 대한 추가 작업이며 [[anyang-frontend-screens]] 2-1절에 의존한다. backend·DB 변경은 없다. 설계 승인 전에는 구현하지 않는다.

**2026-09-28 추가(확인 항목 22·23)**: 아래 5-1, 13-1 두 작업 단위를 추가했다. 둘 다 이미
1차 구현된 5번(채팅)·13번(공지 수집 관리)에 대한 추가 작업이며, [[anyang-frontend-screens]]의
3절(채팅 인용 카드)·11절(공지 목록 탭) draft 반영에 의존한다.

**2026-09-28 추가(확인 항목 29)**: 아래 2-1 작업 단위를 추가했다. 이미 1차 구현된 2번(로그인/
가입 화면)에 대한 추가 작업이며, [[anyang-frontend-screens#1-1. 비밀번호 길이·시도 제한 안내 (신규, 확인 항목 29)]]
draft 반영에 의존한다.

**2026-09-29 추가(확인 항목 43)**: 이미 1차 구현된 9번("AI가 기억하는 내 정보" 화면)·
11번(개인정보 처리방침 페이지)에 문구 추가 작업을 반영했다. 화면 구조·API 연동은 바뀌지
않는다 — [[anyang-frontend-screens]] 4차 개정(6절·9절) draft 반영에 의존한다.

## Details

### 작업 단위 (모두 [[anyang-frontend-screens]] 승인 후 착수, 값은 그 문서 승인으로 확정됨)

1. **공통 레이아웃·인증 가드** — 하단 탭, 로그인/온보딩/동의 리다이렉트 규칙, 403 응답 코드
   (`ACCOUNT_SUSPENDED`/`CONSENT_REQUIRED`/`ADMIN_ONLY`, backend 1-4절) 분기 처리. 정지는
   로그인을 막지 않고 `session.suspended` 플래그로 정지 안내 화면을 보여주는 방식(backend
   1-2절, 로그인 차단 방식 폐기)으로 처리한다 — 세션 종료 없이 403 `ACCOUNT_SUSPENDED` 응답을
   받으면 정지 안내 화면으로 돌려보낸다. `ADMIN_EMAIL_RESERVED`는 이 공통 가드가 아니라
   2번 작업(가입 화면)에서 인라인 오류로 처리한다. 이후 전체 화면이 의존.
2. **로그인/가입 화면** (`/login`) — Google 소셜 + 이메일·비밀번호 폼, `POST /api/auth/register`
   연동(body는 backend 1절의 `consents` 형식). 정지 계정은 로그인 성공 후 정지 안내 화면으로
   이동(1번 작업과 연계, 탈퇴 경로 링크 포함). `OAuthAccountNotLinked`(backend 1-5절) 오류
   안내, 가입 시 403 `ADMIN_EMAIL_RESERVED`(backend 13-0절) 인라인 오류 처리 포함. 비밀번호
   재설정은 1차 출시 제외로 확정됐으므로 화면을 만들지 않고 Google 로그인 안내 문구로
   대체한다.
2-1. **비밀번호 길이·시도 제한 반영** (`/login`, 신규 — 확인 항목 29) — 가입 폼 비밀번호
   8자 미만 인라인 오류(클라이언트 검증 + 서버 400 `PASSWORD_TOO_SHORT` 응답 처리), 로그인·
   가입 429 `TOO_MANY_ATTEMPTS` 응답 시 차단 안내 메시지 표시. 세부는
   [[anyang-frontend-screens#1-1. 비밀번호 길이·시도 제한 안내 (신규, 확인 항목 29)]]. 2번
   이후 착수.
3. **개인정보 동의 화면** (`/consent`) — 가입 시 필수 동의, 체크박스 2개(코드 식별자
   `collection_use`·`overseas_transfer`) 모두 필수. 두 번째 체크박스 라벨·legend는
   2026-09-28 개정(확인 항목 41)으로 국가명·서비스명 없는 단순 문구("AI 활용 동의" 계열)로
   바뀐다 — 코드 식별자·필수 검증·API body는 바뀌지 않는다. 전화번호·이메일·주민등록번호
   가림 안내는 남기는 방향으로 제안. 세부는
   [[anyang-frontend-screens#7. 개인정보 동의 화면 (`/consent`)]] 참고.
   `POST /api/auth/register`/`POST /api/auth/consent`의 `consents` body 연동. 재동의
   강제(공통 가드가 403 + `CONSENT_REQUIRED`를 감지해 이 화면으로 리다이렉트, 1번 작업과
   연계) 포함 — 단 이번 문구 개정 자체는 재동의를 유발하지 않는다(`POLICY_VERSION` 유지).
   이 화면에는 탈퇴 경로(3-1번) 링크도 함께 둔다. 세부 문구는 법률 검토 확정 후 교체(구조
   변경 아님, 제안).
3-1. **계정 탈퇴 화면** (`/settings/account`) — 확인 다이얼로그(네이티브 `window.confirm` 또는
   모달, 제안), `DELETE /api/account` 연동(재동의 필요·정지 상태에서도 호출 가능, backend
   1절·1-2절 예외), 1년 보관 안내 문구 표시.
4. **온보딩 화면** (`/onboarding`) — 프로필 입력 폼(4개 확정 항목·코드값 셋 확정 기준 —
   [[anyang-service-scope]]), `PUT /api/profile` 연동. `occupation_type` 입력 컴포넌트(select
   vs 라디오)는 화면 설계 승인 시 확정.
5. **채팅 화면** (`/chat`) — 메시지 리스트, 스트리밍 응답 렌더링, 히스토리 목록 진입점.
   `POST /api/chat` 연동. (1차 구현은 인용 카드 없이 텍스트만 표시 — 인용 카드는 5-1번.)
5-1. **채팅 인용 카드 반영** (`/chat`, 신규 — 확인 항목 22) — SSE 파서에 `event: citations`
   블록 분기 추가, 인용 카드(제목·게시일, `/notices/[id]` 링크) 렌더링, 빈 목록 시 카드 행
   생략. 세부는 [[anyang-frontend-screens#3. 채팅 화면 (`/chat`)]] "인용 공지 카드"
   절. 5번 이후 착수.
6. **추천 공지 피드·상세** (`/notices`, `/notices/[id]`) — `GET /api/notices/recommended`,
   `GET /api/notices/:id` 연동.
7. **알림 설정 화면** (`/settings/notifications`) — 토글·시각 선택 UI, 알림을 켠 시각
   (`enabled_at`) 이후 공지만 알림 대상이라는 안내 문구(backend 2-2절), 푸시 권한 요청 흐름,
   도메인 변경 재구독 유도 배너, `GET/PUT /api/notify-settings`,
   `POST/DELETE /api/push/subscribe` 연동.
8. **PWA manifest·서비스워커** — `app/manifest.ts`, `sw.js`(푸시 수신·클릭 처리), 등록 로직.
   1·7번과 함께 진행(권한 요청 흐름이 서비스워커에 의존).
9. **"AI가 기억하는 내 정보" 화면** (`/settings/memory`) — 조회·수정·삭제. `GET /api/preferences`,
   `PUT /api/preferences/:id`, `DELETE /api/preferences/:id` 연동. **(확인 항목 43 추가)**
   이름 기억 안내 문구(목록 위 고정 표시) 반영. 세부는
   [[anyang-frontend-screens#6. "AI가 기억하는 내 정보" (`/settings/memory`)]] 참고.
10. **대화 히스토리 목록 화면** (`/conversations`) — `GET /api/conversations`,
    `GET /api/conversations/:id/messages` 연동.
11. **개인정보 처리방침 페이지** (`/privacy-policy`) — 정적 페이지. AI 처리 고지(국가명·
    서비스명 없이 "대화 내용은 AI가 처리" 수준, 2026-09-28 개정·확인 항목 41), 외부 AI API
    사용량 90일 보관 고지(서비스명 제외), 동의 기록 1년 보관 고지 포함. **(확인 항목 43
    추가)** 이름·호칭 기억 고지 문장을 "AI 처리" 절에 추가. 기존
    `web/test/consent-privacy-wording.test.ts` 금지 문자열 검사를 새 문장에도 지킨다. 세부는
    [[anyang-frontend-screens#9. 개인정보 처리방침 페이지 (`/privacy-policy`)]] 참고. 법률
    검토된 문구 확정 후 콘텐츠만 채운다(구조는 이번에 만든다).
12. **관리자 공통 레이아웃·가드** (`/admin`) — 관리자 API 응답 코드(401/403 `ADMIN_ONLY`)
    기준 접근 판정([[anyang-frontend-screens#공통 레이아웃 (모바일 우선)]]의 "관리자
    가드" 절 — 판정은 `ADMIN_EMAILS` + 이번 세션의 로그인이 Google인 경우만 통과, 계정이
    아니라 이번 로그인 방식(JWT provider 클레임) 기준, backend 13-0절), 확인 다이얼로그
    공통 컴포넌트(정지·정지 해제·삭제 공용). 13~15번이 의존.
13. **공지 수집 관리 화면** (`/admin/collect-runs`) — 실행 이력, 수동 수집 실행(최대 300초
    진행 상태 표시). `GET/POST /api/admin/collect-runs` 연동. (1차 구현은 실행 이력·수동
    수집만 있고 숨김 UI 없음 — 공지 목록·숨김/해제는 13-1번.)
13-1. **공지 목록 탭 반영** (`/admin/collect-runs`, 신규 — 확인 항목 23) — "실행 이력"/
    "공지 목록" 탭 전환, `GET /api/admin/notices`(상태 필터·페이지 이동) 연동, 숨김/해제
    확인 다이얼로그 경유 `PATCH /api/admin/notices/:id/hide|unhide` 연동, 400/5xx 에러 표시.
    세부는 [[anyang-frontend-screens#11. 공지 수집 관리 (`/admin/collect-runs`)]]
    "공지 목록 탭" 절. 13번 이후 착수, 12번(관리자 공통 가드)에도 의존.
14. **알림 발송 현황·외부 API 사용량 화면** (`/admin/notify-logs`, `/admin/api-usage`) — 날짜
    범위 표. `GET /api/admin/notify-logs/summary`, `GET /api/admin/api-usage/summary` 연동.
    파일이 겹치지 않아 13번과 병렬 가능.
15. **사용자 관리·통계 화면** (`/admin/users`) — 통계 카드, 사용자 목록, 정지·정지 해제·삭제
    (확인 다이얼로그 경유). `GET /api/admin/users`, `GET /api/admin/stats`,
    `PATCH /api/admin/users/:id/suspend|unsuspend`, `DELETE /api/admin/users/:id` 연동.

### 순서 제안

1 → 2 → 2-1(2와 파일 겹치면 순차, 아니면 병렬 가능) → 3 → 3-1(3과 파일 겹치지 않으면 병렬
가능) → 4 → (5, 6 병렬 가능, 파일 겹치지 않음) → 5-1 → (7, 8 함께) → 9, 10(각각 병렬 가능,
파일 겹치지 않음) → 11 → 12 → (13, 14, 15 각각 병렬 가능, 파일 겹치지 않음) → 13-1.

### 청안 디자인 적용 (확인 항목 52, 신규, 설계 draft — 구현은 재승인 후)

위 1~15번은 이미 1차 구현이 끝난 작업이다. 아래 C1~C10은 그 위에 청안 디자인을 입히는 새 작업 단위다.
설계 근거는 [[anyang-cheongan-design-adoption]](토큰·공존·글꼴·반응형·컴포넌트)와
[[anyang-frontend-screens]]의 "청안 디자인 적용 화면 스펙"이다. 모든 값은 그 설계 승인으로 확정된다.
구현 중에는 승인된 설계 문서를 고치지 않고, 바꿀 것이 생기면 "설계 변경 필요"로 보고한다.
구현 단계에서 UI를 만들 때는 `design-taste-frontend` 스킬을 호출한다(스킬 규칙은 dev-common 참고).

범위: 웹(PWA)만. backend·database 변경 없음. 범위 밖: 47(c) 버그 ①~⑤, 48(f-8) 문구 정합성. API 호출·인증 가드·문구 테스트 대상 고정 문구는 바꾸지 않는다.

| 단위 | 작업 | 만들거나 고치는 파일 | 선행 |
|---|---|---|---|
| C1 | Tailwind·토큰 도입: `tailwindcss`·`@tailwindcss/postcss` 설치(사용자 승인된 구현 단계에서), `postcss.config.mjs`, 청안 `design-system/` 폴더를 수정 없이 `web/design-system/`로 복사 | `web/package.json`, `web/package-lock.json`, `web/postcss.config.mjs`(신규), `web/design-system/*`(신규 6개) | 재승인 |
| C2 | `globals.css` 이행: 맨 위에 `@import` 3줄, 충돌 이름 정리(`--border-strong`→`--line-strong`, `--radius-sm`→`--legacy-radius-sm`), 옛 의미 토큰을 청안 토큰으로 다시 가리키기, 변수 외 규칙 전부 `@layer components`로 이동, `@layer base`(body·keep-all·focus-visible), `@theme`에 `--breakpoint-desktop`·`--container-column`·`--container-admin` 추가 | `web/app/globals.css` | C1 |
| C3 | 글꼴·뷰포트: `next/font/google` 3종을 `<html>` className으로, `viewport`(`themeColor`, `viewportFit`), `manifest.ts`의 색 | `web/app/layout.tsx`, `web/app/manifest.ts` | C2 |
| C4 | 공통 틀·컴포넌트: `ui/icon.tsx`, `ui/controls.tsx`, `ui/screen.tsx`, `app-nav.tsx`(하단 탭 + 사이드바), `(tabs)/layout.tsx`를 새 틀로, 탭 판정 함수와 단위 테스트 | `web/app/_components/ui/icon.tsx`·`controls.tsx`·`screen.tsx`(신규), `web/app/_components/app-nav.tsx`(신규), `web/app/_lib/nav-tabs.ts`(신규), `web/test/frontend-nav-tabs.test.ts`(신규), `web/app/(tabs)/layout.tsx` | C3 |
| C5 | 공지 목록·상세: 화면 스펙 2·3 | `web/app/_components/ui/notice-row.tsx`(신규), `web/app/(tabs)/notices/notices-list.tsx`, `web/app/(tabs)/notices/[id]/notice-detail.tsx`, 날짜 서식·링크 변환 함수 `web/app/_lib/format.ts`(신규) + 테스트 `web/test/frontend-format.test.ts`(신규) | C4 |
| C6 | 대화: 화면 스펙 1, `/conversations` 행 외형 | `web/app/_components/ui/chat.tsx`(신규), `web/app/(tabs)/chat/chat-client.tsx`, `web/app/(tabs)/conversations/conversations-client.tsx`, 나이대 표시 함수 `web/app/_lib/age-band-label.ts`(신규) + 테스트 `web/test/frontend-age-band-label.test.ts`(신규) | C4, C5의 `format.ts` |
| C7 | 알림: 화면 스펙 4, iOS 홈 화면 추가 전 판정 함수와 단위 테스트 | `web/app/(tabs)/settings/notifications/notifications-client.tsx`, `web/app/_lib/install-state.ts`(신규), `web/test/frontend-install-state.test.ts`(신규) | C4 |
| C8 | 내 정보·계정 탈퇴: 화면 스펙 5·6, 5초 지연 삭제 로직과 단위 테스트, `/settings/memory` 리다이렉트 | `web/app/(tabs)/settings/page.tsx`(신규), `web/app/(tabs)/settings/profile-section.tsx`(신규), `web/app/(tabs)/settings/memory/memory-client.tsx`, `web/app/(tabs)/settings/memory/page.tsx`, `web/app/(tabs)/settings/account/account-client.tsx`, `web/app/_lib/delayed-delete.ts`(신규), `web/test/frontend-delayed-delete.test.ts`(신규) | C4, C5의 `format.ts` |
| C9 | 시안 없는 화면 확인과 보정: 로그인·동의·온보딩·정지·처리방침·관리자 4종을 3폭에서 확인하고 깨진 곳만 `globals.css` 규칙 조정, 관리자 최대 폭·표 가로 스크롤 | `web/app/globals.css`, `web/app/admin/layout.tsx`, `web/app/admin/*/*-client.tsx`(표 감싸기만) | C2~C8 |
| C10 | 정리(삭제는 사용자 승인): 쓰이지 않는 옛 클래스 삭제, 쓰이지 않는 `app/_components/bottom-nav.tsx` 삭제 | `web/app/globals.css`, `web/app/_components/bottom-nav.tsx` | C9 + 사용자 삭제 승인 |

- 순서: C1 → C2 → C3 → C4 → (C5, C7, C8은 파일이 겹치지 않아 병렬 가능하나 같은 `globals.css`·`ui/*`를 읽으므로 순차를 기본으로 한다) → C6(C5의 날짜 서식 필요) → C9 → C10.
- 커밋: 단위마다 테스트·빌드를 통과한 뒤 git-manager에게 파일 목록과 함께 맡긴다. C2는 모든 기존 화면에 영향을 주므로 화면 확인(아래)을 끝낸 뒤에만 커밋한다. push는 사용자 승인 전 보류.
- 새 로직 단위 테스트(vitest, 프레임워크·픽스처 추가 없음): 탭 판정(`/settings/notifications`는 알림, `/settings`·`/settings/account`는 내 정보, `/notices/[id]`는 공지이면서 탭 바 숨김), 날짜 서식(`2026-09-01` → `2026.09.01`, `null` 처리)·링크 변환(http(s)만 링크로, `javascript:` 같은 것은 일반 글자), 나이대 표시 형식(서버 `ageBandLabel`과 별개 함수, 서버 값은 바꾸지 않음), iOS 홈 화면 추가 전 판정(iPhone 브라우저 탭 = true, 홈 화면 앱 = false, 데스크톱 = false, iPadOS Mac 사용자 에이전트 + 터치 지점 수), 지연 삭제(5초 전 되돌리기는 요청 없음, 5초 후 요청, 화면 떠날 때 즉시 요청, 연속 삭제 시 앞 항목 즉시 요청, 실패 시 복구 — 가짜 타이머 사용).
- 수정하지 않는 것: `app/api/**`, `lib/**`, `db/**`, 인증 가드(`session-guard.ts`), `consent-form.tsx`·`privacy-policy/page.tsx` 본문(문구). `memory-client.tsx`는 `consent-privacy-wording.test.ts`가 읽는 고정 문구("이름이나 호칭 같은 사실을 기억해")를 유지한다.

#### 청안 적용 테스트 방법

1. **빌드·단위**: 각 단위 끝에 `npm test`(`vitest run`)와 `npm run build`를 실행한다. 둘 다 통과해야 커밋한다. `npm test`에는 `consent-privacy-wording.test.ts`가 포함되어 문구가 유지되는지 걸린다. 이 테스트는 className 변경은 못 잡는다.
2. **CSS 산출 확인(C1~C3)**: 빌드 후 산출 CSS(`.next/static/css/*.css`)에서 `--color-ink`(청안 토큰이 항상 나오는지), `type-body`·`h-touch` 같은 유틸리티, `desktop` 브레이크포인트 미디어쿼리(`min-width:75rem`)가 있는지 검색한다. 없으면 설계의 `@import`·`layer()` 안(3-2절) 대안으로 돌아가 보고한다.
3. **화면 확인(실제 실행)**: `npm run dev`로 띄우고 브라우저 개발자 도구의 기기 모드(또는 창 폭 조절)로 아래 3폭에서 확인한다. 폭: 390×844(모바일), 768×1024(태블릿), 1200×800(데스크톱; 1440×900도 한 번). 자동 캡처 도구(Playwright 등)는 설치가 필요하므로 사용자 승인 없이는 설치하지 않는다.
   - 공통(각 폭): 가로 스크롤 없음, 탭 바/사이드바가 폭에 맞게 나오고 현재 항목이 표시됨, 누를 곳 높이 44px 이상, 키보드 Tab 이동 시 포커스 윤곽선이 보임, 글꼴 3종이 실제로 적용됨(개발자 도구 Network·Computed).
   - 390: 하단 탭 4개, 공지 상세에서 탭 바가 숨고 "원문 보기" 바가 보임.
   - 768: 하단 탭 유지, 콘텐츠가 가운데 최대 720px.
   - 1200: 왼쪽 사이드바 240px, 하단 탭 없음, 콘텐츠 열 가운데.
   - 흐름(로그인 필요): 채팅 질문 전송 → 근거 카드 → 카드 클릭 시 공지 상세 → "원문 보기" 새 탭, 공지 목록 더 보기, 알림 켜기·끄기·시각 변경·재구독 배너, 내 정보에서 기억 수정·삭제(5초 안 되돌리기, 5초 뒤 서버 삭제, 화면 이동 시 즉시 삭제)·로그아웃·탈퇴 다이얼로그 취소, 대화 기록 이동.
   - 시안 없는 화면(C2 직후와 C9): `/login`, `/consent`, `/onboarding`, `/suspended`, `/privacy-policy`, 관리자 4종을 같은 3폭에서 확인(로그인 전 화면은 세션 없이 열 수 있음).
   - 로그인·DB가 필요한 화면을 이 환경에서 열지 못하면(로컬 DB·인증 설정 `web/.env.local`이 쓸 수 있는지 먼저 확인) 열지 못했다고 보고하고, 확인한 화면과 못 한 화면을 구분해 적는다.
4. **접근성 점검**: 스위치 `aria-checked`·`aria-labelledby`, 현재 탭 `aria-current`, 아이콘 버튼 `aria-label`, `prefers-reduced-motion`에서 전환이 꺼지는지(`globals.css` 기존 규칙 유지).
5. **회귀**: 기존 vitest 전체(채팅 스트림 파서·api-fetch·푸시 변환 등)가 그대로 통과해야 한다. 푸시 구독 payload(`endpoint`/`p256dh`/`auth`)와 재동의·정지 가드 흐름은 코드를 바꾸지 않았음을 diff로 확인한다.

### 공지 화면 시안 반영 (확인 항목 55, 신규, 설계 draft, 구현은 재승인 후)

C5로 이미 구현된 공지 목록·상세에 별표 고정 공지, "이미지" 칩, 첨부 파일명, 원문 페이지 링크, 탭 복귀 재조회를 더한다. 설계 근거는 [[anyang-frontend-screens]]의 공지 목록·공지 상세 절(2026-10-04 개정)이고 API 필드는 [[anyang-backend-api#2-1. 추천 공지 피드·상세 (frontend 조율, 2026-09-27)]]이다. 값은 그 설계 승인으로 확정된다. UI를 만들 때는 `design-taste-frontend` 스킬을 호출한다. 단 그 스킬은 랜딩·포트폴리오용이고 이 화면은 청안 토큰 체계 안의 목록 행이라, 스킬의 아이콘·글꼴·색 규칙 중 청안 토큰과 충돌하는 것(예: 청안 자체 아이콘 사용, 확정된 글꼴)은 청안 설계를 따르고 그 사실을 보고에 적는다.

| 단위 | 작업 | 만들거나 고치는 파일 | 선행 |
|---|---|---|---|
| N1 | 공지 행: 고정 공지 별표 + 굵은 제목, `image_count>0` 칩, 별표 `aria-hidden` + 읽기 글자 "고정 공지, ". `ui/icon.tsx`에 `star` 추가 | `web/app/_components/ui/notice-row.tsx`, `web/app/_components/ui/icon.tsx`, 행 렌더 테스트 `web/test/frontend-notice-row.test.ts`(신규) | 재승인, backend의 응답 필드 구현 |
| N2 | 공지 상세: 첨부 파일명 목록(0개면 영역 없음), 안내 한 줄, 하단 버튼 글자 "원문 페이지에서 보기", `Notice` 타입에 `attachments`·`image_count` 추가 | `web/app/(tabs)/notices/[id]/notice-detail.tsx`, 첨부 렌더 테스트 `web/test/frontend-notice-detail.test.ts`(신규) | N1 |
| N3 | 목록 최신성: `visibilitychange`·`pageshow(persisted)` 재조회, 최소 간격 판정 `shouldRefetch`, 1페이지 병합 `mergeFirstPage`, 구독 함수와 해제, 조용한 갱신(로딩·오류 문구 없음) | `web/app/(tabs)/notices/notices-list.tsx`, `web/app/_lib/notices-refetch.ts`(신규), `web/test/frontend-notices-refetch.test.ts`(신규) | N1 |

- 하단 탭바(`app-nav.tsx`)는 시안과 같은 4탭이라 바꾸지 않는다. `app/api/**`, `lib/**`, `db/**`는 건드리지 않는다.
- 테스트 환경이 `node`(DOM 없음)이므로 새 의존성 없이 `react-dom/server`의 `renderToStaticMarkup`과 순수 함수로 검사한다. jsdom·testing-library 도입은 설계 변경이라 하지 않는다. `next/link`가 이 환경에서 그려지지 않으면 조건 판정을 순수 함수로 분리한다.
- 단위 테스트 항목: 별표·칩 조건(고정 공지만 별표와 읽기 글자, `image_count>0`만 칩, 필드 없음/0이면 둘 다 없음), 첨부 0개(영역 없음)/n개(소제목 "첨부 파일 n개", 파일명 n줄), `source_url`이 http(s)가 아니면 원문 버튼·안내 없음, `shouldRefetch`(30초 이내/이후/조회 중), `mergeFirstPage`(새 1페이지 앞, 중복 id 제거), 구독 함수가 visible·persisted pageshow에서만 콜백을 부르고 해제 뒤에는 안 부름(가짜 `EventTarget`).
- 화면 확인(실제 실행): `npm run dev`로 `/notices`와 상세를 390px·1200px에서 시안 설명(별표 고정 공지, "이미지" 배지, 날짜, 제목·발췌 각 2줄)과 대조. 고정 공지·이미지·첨부가 있는 글과 없는 글을 모두 본다(수집 전 DB가 비어 있으면 목 응답이나 백필 뒤 데이터가 필요하다). 탭 전환 후 복귀 시 30초 뒤 요청 1건, 30초 안 0건, 갱신 중 깜빡임 없음. 열지 못한 화면이 있으면 못 했다고 보고한다.
- 커밋: 단위마다 `npm test`·`npm run build` 통과 후 git-manager에 맡긴다. push는 사용자 승인 전 보류.

### 공지 수집 관리 — 보드 수집 이력 표시 (확인 항목 56, 신규, 설계 draft, 구현은 재승인 후)

수집 주체가 보드로 바뀌어([[anyang-board-collector]]) 관리자 "수동 수집" 버튼이 410을 받고 이력에 보드 행이 쌓인다. 설계는 [[anyang-frontend-screens]] 11절 "56 개정"이고 값은 모두 `(미확정)`이며 그 설계 승인으로 확정된다. 이미 구현된 13번(`collect-runs-client.tsx`)에 대한 추가 작업이다. 새 API 없음, backend·database 변경 없음, 사용자 화면(`app/(tabs)/**`) 변경 없음.

| 단위 | 작업 | 만들거나 고치는 파일 | 선행 |
|---|---|---|---|
| K1 | `describeRun`(실행 방식·상태·건수·오류 코드 문구, 원문 보존)과 `isDirectCollectDisabled(status, body)` 순수 함수 + 단위 테스트. `collect-runs-client.tsx`: 410(`DIRECT_COLLECT_DISABLED`)이면 안내(`hint-text`, `role="status"`)와 버튼 비활성, 이력 행 표시를 `describeRun` 결과로, 이력 위 안내 한 줄 | `web/app/_lib/collect-run-label.ts`(신규), `web/test/frontend-collect-run-label.test.ts`(신규), `web/app/admin/collect-runs/collect-runs-client.tsx` | 재승인 |

- 수정하지 않는 것: `app/api/**`, `lib/**`, `db/**`, `notices-tab.tsx`, `app/(tabs)/**`. 서버가 주는 값은 바꾸지 않고 화면에서만 변환한다.
- 테스트 항목과 화면 확인 절차는 [[anyang-frontend-screens]] 테스트 방법의 "공지 수집 관리 — 보드 수집 이력 표시" 항목이 원본이다(여기에 복제하지 않는다). 매핑 대상 코드는 [[anyang-board-collector]] A-4 3번·C-2·C-4에 적힌 것만이고, 그 문서가 코드를 바꾸면 매핑표와 테스트를 같이 고친다.
- 구현 중 backend가 `error_summary` 형식을 바꾸면(미해결 질문) 설계 변경이다. 구현 단계에서 UI를 만들 때는 `design-taste-frontend` 스킬을 호출하되, 기존 관리자 화면의 클래스(`card`, `hint-text`, `error-text`)를 따른다.
- 커밋: `npm test`·`npm run build` 통과 뒤 git-manager에 맡긴다. push는 사용자 승인 전 보류.

### 테스트 알림 버튼 (확인 항목 58, 신규, 설계 draft)

알림 설정 화면에 "테스트 알림 보내기" 버튼을 더하고, 서비스워커가 테스트 payload의 `url`로 알림 클릭 이동을 하게 한다. 사용자가 승인한 범위라 재승인 없이 구현하지만 문구·표시 조건 등 `(미확정)` 값은 구현 시작 때 설계 문서에서 확정 여부를 확인한다. UI를 만들 때는 `design-taste-frontend` 스킬을 호출하고, 청안 토큰·기존 `Button`과 충돌하는 규칙은 청안 설계를 따르며 그 사실을 보고에 적는다. 설계 근거는 [[anyang-frontend-screens]]이고 API 계약은 [[anyang-backend-api#8-1. 테스트 알림 (신규, 2026-10-04, 확인 항목 58)]]이다.

| 단위 | 작업 | 만들거나 고치는 파일 | 선행 |
|---|---|---|---|
| T1 | 서비스워커 `parsePushPayload`: 안전한 `url`(`/` 시작, `//`·`/\` 시작 아님) 우선, 아니면 기존 규칙. 테스트 갱신(타입에 `url?: string`, 케이스 ⑪~⑭ 추가) | `web/public/sw.js`, `web/test/frontend-push.test.ts` | backend 문서 확인(코드 의존 없음) |
| T2 | `describeTestResult(status, body)` 순수 함수와 단위 테스트(케이스 ①~⑩) | `web/app/_lib/test-notify.ts`(신규), `web/test/frontend-test-notify.test.ts`(신규) | 없음 |
| T3 | 알림 화면: 켜진 상태에서만 보이는 버튼, 진행 중 비활성, 결과 줄(`role="status"`), `fetch` 예외 처리 | `web/app/(tabs)/settings/notifications/notifications-client.tsx` | T2, backend의 `POST /api/notify-settings/test` 구현(없으면 목 응답으로 화면만 확인) |

- 수정하지 않는 것: `app/api/**`, `lib/**`, `db/**`, 푸시 구독·권한 흐름, `push`·`notificationclick` 핸들러, `page.tsx`.
- 테스트 항목과 화면 확인 절차는 [[anyang-frontend-screens]] 테스트 방법의 "테스트 알림 보내기(확인 항목 58)"가 원본이다(여기에 복제하지 않는다). 실제 기기 수신·클릭 이동은 메인 세션·사용자 확인 몫이다.
- 커밋: 단위(또는 T1~T3 묶음)마다 `npm test`·`npm run build` 통과 뒤 git-manager에 맡긴다. push는 사용자 승인 전 보류.

### 채팅 뒤로가기 시 대화·인용 유지 (확인 항목 60, 신규)

공지 상세에서 뒤로 와도 대화·인용 카드·스크롤이 남게 한다. 설계 근거와 모든 값은 [[anyang-frontend-screens#3-1. 채팅 뒤로가기 시 대화·인용 유지 (신규, 확인 항목 60)]]이고 여기에 옮겨 적지 않는다. backend·DB 변경은 없다. UI를 새로 만들지 않고 기존 채팅 화면의 상태 처리만 바꾸므로 `design-taste-frontend` 스킬은 부르지 않는다(안내 한 줄만 추가).

| 단위 | 작업 | 만들거나 고치는 파일 | 선행 |
|---|---|---|---|
| S1 | 순수 함수와 단위 테스트: 키 생성, 보관 직렬화·모양 검사 읽기, 크기 상한·대화 개수 정리, 저장소 오류 흡수 래퍼, 접두사 일괄 삭제, 스트리밍 보관분 서버 병합 | `web/app/_lib/chat-snapshot.ts`(신규), `web/test/frontend-chat-snapshot.test.ts`(신규) | 없음 |
| S2 | `page.tsx`가 `userId`를 내려주고, `chat-client.tsx`에 복원(보관분 → 서버), 저장 시점, 스크롤 복원, 대화 id 수신 시 URL 교체, `loadedIdRef`로 중복 불러오기 방지, 새 대화 흐름 유지 | `web/app/(tabs)/chat/chat-client.tsx`, `web/app/(tabs)/chat/page.tsx` | S1 |
| S3 | 로그아웃·탈퇴 후 `clearAllChatSnapshots` 호출 | `web/app/(tabs)/settings/profile-section.tsx`, `web/app/suspended/suspended-actions.tsx`, `web/app/(tabs)/settings/account/account-client.tsx` | S1 |

- 수정하지 않는 것: `notice-detail.tsx`(뒤로 버튼은 이미 `router.back()`이고 URL만 맞으면 된다), `app/api/**`, `lib/**`, `db/**`, `chat-stream.ts`.
- 구현 시작 때 승인된 설계 문서의 확정 여부를 확인한다. 특히 URL 교체 수단은 응답 헤더 수신 직후 `window.history.replaceState`(제안 안 A)이고, 실행 확인에서 의도대로 안 되면 설계 변경으로 보고한다.
- 테스트 항목과 수동 시나리오는 [[anyang-frontend-screens]] 테스트 방법의 "채팅 뒤로가기 유지(확인 항목 60, 3-1절)"가 원본이다(여기에 복제하지 않는다).
- 커밋: S1 → S2 → S3 순으로 `npm test`·`npm run build` 통과 뒤 git-manager에 맡긴다(S1·S2는 묶어도 된다). push는 사용자 승인 전 보류.

#### 60(b)·(c) 후속 (S4, 32차 재승인 후 구현)

S1~S3 구현 뒤 사용자가 정한 세 가지를 코드에 반영한다. 근거는 [[anyang-frontend-screens]] 3-1절 5번 ③·이전 조회 취소, 6번이고 값은 옮겨 적지 않는다. 오류 문서 [[anyang-chat-snapshot-scroll-restore-order]]도 참고한다.

| 단위 | 작업 | 만들거나 고치는 파일 | 선행 |
|---|---|---|---|
| S4 | ① 안내를 띄운 경우 보관분 `streaming: true` 유지(다음 복원에서 재조회) ② 서버 조회 실패·네트워크 예외 때 보관분 표시, 404면 보관분 삭제·빈 화면 ③ 브라우저 뒤로가기로 `/chat`(prop `null`) 도착 때도 진행 중 이전 조회 취소. 단위 테스트에 ①·② 케이스 추가 | `web/app/(tabs)/chat/chat-client.tsx`, `web/app/_lib/chat-snapshot.ts`, `web/test/frontend-chat-snapshot.test.ts` | 32차 재승인 |

### 공지 화면 관심사 시트 (확인 항목 61, 신규, 설계 draft)

공지 목록의 "관심사 보기"를 `/notices` 위 바텀시트로 바꾸고, 시트 안 링크가 내 정보 기억 구역(`#memory`)으로 가게 한다. 설계 근거와 모든 값은 [[anyang-frontend-screens]] 2-1절이고 여기에 옮겨 적지 않는다. 기존 `GET /api/preferences`만 쓰므로 backend·DB 변경은 없다(구현 중 필요해지면 멈추고 보고). UI를 만들 때는 `design-taste-frontend` 스킬을 호출하고, 청안 토큰·기존 컴포넌트와 충돌하는 규칙은 청안 설계를 따르며 그 사실을 보고에 적는다. 구현 시작 때 승인된 설계 문서에서 `(미확정)` 값의 확정 여부를 확인한다.

| 단위 | 작업 | 만들거나 고치는 파일 | 선행 |
|---|---|---|---|
| V1 | `sheetView(status, count)` 순수 함수와 단위 테스트 | `web/app/_lib/interest-sheet.ts`(신규), `web/test/frontend-interest-sheet.test.ts`(신규) | 없음 |
| V2 | `Sheet` 컴포넌트(네이티브 `<dialog>`, Esc·바깥 클릭·닫기, 포커스 복귀 보장, `aria-labelledby`·`aria-modal`, 모바일 바텀시트 / `desktop:` 모달, 열 때 움직임)와 상태별 본문 `InterestSheetBody`, 정적 렌더 테스트 | `web/app/_components/ui/sheet.tsx`(신규), `web/app/(tabs)/notices/interest-sheet.tsx`(신규), `web/app/globals.css`(열 때 움직임이 필요할 때만), `web/test/frontend-interest-sheet.test.ts` | V1 |
| V3 | `notices-list.tsx`: `interestCount` 대신 `status`·`items` 보관(머리 동작 불변), 링크를 버튼으로, 시트 열림 상태, "다시 시도" | `web/app/(tabs)/notices/notices-list.tsx` | V1, V2 |
| V4 | `MemoryClient` 구역에 `id="memory"`(와 `scroll-mt-4`), 정적 렌더 테스트, 실제 실행으로 해시 이동 확인(안 되면 대체 effect) | `web/app/(tabs)/settings/memory/memory-client.tsx`, `web/test/frontend-interest-sheet.test.ts` | 없음(V3와 함께 확인) |

- 수정하지 않는 것: `app/api/**`, `lib/**`, `db/**`, `notices/page.tsx`, `settings/page.tsx`, `ConfirmDialog`(`controls.tsx`).
- `memory-client.tsx`는 `consent-privacy-wording.test.ts`가 읽으므로 고정 문구를 건드리지 않는다.
- 실행 확인에서 배경 스크롤 잠금·해시 이동이 설계 추정대로 되지 않으면 [[anyang-frontend-screens]] 2-1절의 대체 수단을 적용하고 보고에 적는다. 그 밖의 설계 변경이 필요하면 "설계 변경 필요"로 보고한다.
- 테스트 항목과 수동 시나리오는 [[anyang-frontend-screens]] 테스트 방법의 "관심사 시트(확인 항목 61, 2-1절)"가 원본이다(여기에 복제하지 않는다).
- 커밋: V1~V4를 묶거나 단위마다 `npm test`·`npm run build` 통과 뒤 git-manager에 맡긴다. push는 사용자 승인 전 보류.

## 테스트 방법

1~15번 작업 단위의 테스트는 [[anyang-frontend-screens#테스트 방법]]에 이미 기술돼 있다. 여기서는
중복하지 않는다. 청안 디자인 적용(C1~C10)의 테스트는 위 "청안 적용 테스트 방법"에, 공지 시안 반영(N1~N3)의 테스트는 위 "공지 화면 시안 반영" 절에, 테스트 알림 버튼(T1~T3)은 위 "테스트 알림 버튼" 절에, 관심사 시트(V1~V4)는 위 "공지 화면 관심사 시트" 절에 있다.

## Links

- [[anyang-frontend-screens]]
- [[anyang-backend-api]]
- [[anyang-youth-policy-assistant]]
- [[anyang-cheongan-design-adoption]]
- [[anyang-board-collector]] — 보드 수집기·직접 수집 스위치(K1의 근거)
- [[anyang-chat-snapshot-scroll-restore-order]] — 채팅 보관분 스크롤 복원 효과 순서 오류 기록(S4 참고)
- [[anyang-chat-restore-strictmode-abort]] — StrictMode 이중 effect 조회 취소 오류 기록(S4 참고)
