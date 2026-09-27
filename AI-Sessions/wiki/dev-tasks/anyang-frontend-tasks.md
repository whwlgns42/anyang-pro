---
type: dev-task
date: 2026-09-27
status: draft
owner: frontend
---

# 안양 청년정책 비서 — Frontend 구현 작업 단위

## Summary

[[anyang-frontend-screens]] 설계 승인 후 구현할 작업을 화면 단위로 나눈 목록이다. 각 단위는
독립적으로 테스트·커밋 가능하도록 쪼갰다(dev-common 규칙 4).

## Context

의존: [[anyang-backend-api]]의 인증(동의 포함)·프로필·채팅·공지·알림설정·선호·히스토리·관리자
엔드포인트가 먼저 구현돼 있어야(또는 목/스텁으로라도) 해당 화면을 붙일 수 있다. 개인정보
동의 항목 분리(수집·이용/국외 이전 체크박스 2개)와 비밀번호 재설정 제외는
[[anyang-service-scope]]로 확정됐다(2026-09-27). 프로필 코드값 셋(`gender`,
`occupation_type`, `enrollment_status`)도 [[anyang-service-scope]] "프로필 선택지" 행(user,
2026-09-27)에서 확정됐다. `occupation_type`의 온보딩 입력 컴포넌트(select vs 라디오, 8개
선택지 때문에 나온 제안)는 설계 승인(2026-09-27)으로 네이티브 select로 확정됐다
([[anyang-frontend-screens#2. 온보딩 — 프로필 입력 (`/onboarding`, 미확정)]]).

**2026-09-28 추가(확인 항목 22·23)**: 아래 5-1, 13-1 두 작업 단위를 추가했다. 둘 다 이미
1차 구현된 5번(채팅)·13번(공지 수집 관리)에 대한 추가 작업이며, [[anyang-frontend-screens]]의
3절(채팅 인용 카드)·11절(공지 목록 탭) draft 반영에 의존한다.

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
3. **개인정보 동의 화면** (`/consent`) — 가입 시 필수 동의, 체크박스 2개(수집·이용,
   국외 이전) 모두 필수 — 국외 이전 고지에는 Gemini로 대화 내용을 전송한다는 사실(전송 전
   전화번호·이메일·주민등록번호 형태를 가림)도 포함한다. `POST /api/auth/register`/
   `POST /api/auth/consent`의 `consents` body 연동. 재동의 강제(공통 가드가 403 +
   `CONSENT_REQUIRED`를 감지해 이 화면으로 리다이렉트, 1번 작업과 연계) 포함. 이 화면에는
   탈퇴 경로(3-1번) 링크도 함께 둔다. 세부 문구는 법률 검토 확정 후 교체(구조 변경 아님,
   제안).
3-1. **계정 탈퇴 화면** (`/settings/account`) — 확인 다이얼로그(네이티브 `window.confirm` 또는
   모달, 미확정), `DELETE /api/account` 연동(재동의 필요·정지 상태에서도 호출 가능, backend
   1절·1-2절 예외), 1년 보관 안내 문구 표시.
4. **온보딩 화면** (`/onboarding`) — 프로필 입력 폼(4개 확정 항목·코드값 셋 확정 기준 —
   [[anyang-service-scope]]), `PUT /api/profile` 연동. `occupation_type` 입력 컴포넌트(select
   vs 라디오)는 화면 설계 승인 시 확정.
5. **채팅 화면** (`/chat`) — 메시지 리스트, 스트리밍 응답 렌더링, 히스토리 목록 진입점.
   `POST /api/chat` 연동. (1차 구현은 인용 카드 없이 텍스트만 표시 — 인용 카드는 5-1번.)
5-1. **채팅 인용 카드 반영** (`/chat`, 신규 — 확인 항목 22) — SSE 파서에 `event: citations`
   블록 분기 추가, 인용 카드(제목·게시일, `/notices/[id]` 링크) 렌더링, 빈 목록 시 카드 행
   생략. 세부는 [[anyang-frontend-screens#3. 채팅 화면 (`/chat`, 미확정)]] "인용 공지 카드"
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
   `PUT /api/preferences/:id`, `DELETE /api/preferences/:id` 연동.
10. **대화 히스토리 목록 화면** (`/conversations`) — `GET /api/conversations`,
    `GET /api/conversations/:id/messages` 연동.
11. **개인정보 처리방침 페이지** (`/privacy-policy`) — 정적 페이지. Gemini로 대화 내용을
    전송한다는 국외 이전 고지, 동의 기록 1년 보관 고지 포함. 법률 검토된 문구 확정 후
    콘텐츠만 채운다(구조는 이번에 만든다).
12. **관리자 공통 레이아웃·가드** (`/admin`) — 관리자 API 응답 코드(401/403 `ADMIN_ONLY`)
    기준 접근 판정([[anyang-frontend-screens#공통 레이아웃 (모바일 우선, 미확정)]]의 "관리자
    가드" 절 — 판정은 `ADMIN_EMAILS` + 이번 세션의 로그인이 Google인 경우만 통과, 계정이
    아니라 이번 로그인 방식(JWT provider 클레임) 기준, backend 13-0절), 확인 다이얼로그
    공통 컴포넌트(정지·정지 해제·삭제 공용). 13~15번이 의존.
13. **공지 수집 관리 화면** (`/admin/collect-runs`) — 실행 이력, 수동 수집 실행(최대 300초
    진행 상태 표시). `GET/POST /api/admin/collect-runs` 연동. (1차 구현은 실행 이력·수동
    수집만 있고 숨김 UI 없음 — 공지 목록·숨김/해제는 13-1번.)
13-1. **공지 목록 탭 반영** (`/admin/collect-runs`, 신규 — 확인 항목 23) — "실행 이력"/
    "공지 목록" 탭 전환, `GET /api/admin/notices`(상태 필터·페이지 이동) 연동, 숨김/해제
    확인 다이얼로그 경유 `PATCH /api/admin/notices/:id/hide|unhide` 연동, 400/5xx 에러 표시.
    세부는 [[anyang-frontend-screens#11. 공지 수집 관리 (`/admin/collect-runs`, 미확정)]]
    "공지 목록 탭" 절. 13번 이후 착수, 12번(관리자 공통 가드)에도 의존.
14. **알림 발송 현황·외부 API 사용량 화면** (`/admin/notify-logs`, `/admin/api-usage`) — 날짜
    범위 표. `GET /api/admin/notify-logs/summary`, `GET /api/admin/api-usage/summary` 연동.
    파일이 겹치지 않아 13번과 병렬 가능.
15. **사용자 관리·통계 화면** (`/admin/users`) — 통계 카드, 사용자 목록, 정지·정지 해제·삭제
    (확인 다이얼로그 경유). `GET /api/admin/users`, `GET /api/admin/stats`,
    `PATCH /api/admin/users/:id/suspend|unsuspend`, `DELETE /api/admin/users/:id` 연동.

### 순서 제안

1 → 2 → 3 → 3-1(3과 파일 겹치지 않으면 병렬 가능) → 4 → (5, 6 병렬 가능, 파일 겹치지 않음) →
5-1 → (7, 8 함께) → 9, 10(각각 병렬 가능, 파일 겹치지 않음) → 11 → 12 → (13, 14, 15 각각
병렬 가능, 파일 겹치지 않음) → 13-1.

## 테스트 방법

각 작업 단위의 테스트는 [[anyang-frontend-screens#테스트 방법]]에 이미 기술돼 있다. 여기서는
중복하지 않는다.

## Links

- [[anyang-frontend-screens]]
- [[anyang-backend-api]]
- [[anyang-youth-policy-assistant]]
