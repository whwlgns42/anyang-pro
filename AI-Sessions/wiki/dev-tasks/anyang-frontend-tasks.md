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

의존: [[anyang-backend-api]]의 인증(동의 포함)·프로필·채팅·공지·알림설정·선호·히스토리
엔드포인트가 먼저 구현돼 있어야(또는 목/스텁으로라도) 해당 화면을 붙일 수 있다. 개인정보
동의 화면(`/consent`)의 세부 문구·동의 항목 단일/분리, 프로필 코드값 셋, 비밀번호 재설정
기능 자체는 여전히 미확정이라
[[anyang-frontend-screens#확인이 필요한 항목 (이 문서 관련, pm이 프로젝트 문서에 반영)]]이
풀릴 때까지 해당 세부만 보류한다 — 화면 포함 여부 자체는
[[anyang-service-scope]]로 이미 확정됐으므로 작업 단위 착수를 막지 않는다.

## Details

### 작업 단위 (모두 [[anyang-frontend-screens]] 승인 후 착수, 값은 그 문서 기준 미확정)

1. **공통 레이아웃·인증 가드** — 하단 탭, 로그인/온보딩/동의 리다이렉트 규칙. 이후 전체
   화면이 의존.
2. **로그인/가입 화면** (`/login`) — Google 소셜 + 이메일·비밀번호 폼, `POST /api/auth/register`
   연동. 비밀번호 재설정 화면은 기능 확정 전까지 만들지 않는다.
3. **개인정보 동의 화면** (`/consent`) — 가입 시 필수 동의, `POST /api/auth/register`의
   `consent`, `POST /api/auth/consent` 연동. 세부 문구·체크 항목 분리 여부 확정 후 문구만
   교체(구조 변경 아님, 제안).
4. **온보딩 화면** (`/onboarding`) — 프로필 입력 폼(4개 확정 항목 기준), `PUT /api/profile` 연동.
   코드값 셋 확정 시 라디오 버튼 라벨만 교체(재설계 아님).
5. **채팅 화면** (`/chat`) — 메시지 리스트, 스트리밍 응답 렌더링, 공지 인용 카드, 히스토리
   목록 진입점. `POST /api/chat` 연동.
6. **추천 공지 피드·상세** (`/notices`, `/notices/[id]`) — `GET /api/notices/recommended`,
   `GET /api/notices/:id` 연동.
7. **알림 설정 화면** (`/settings/notifications`) — 토글·시각 선택 UI, 푸시 권한 요청 흐름,
   도메인 변경 재구독 유도 배너, `GET/PUT /api/notify-settings`,
   `POST/DELETE /api/push/subscribe` 연동.
8. **PWA manifest·서비스워커** — `app/manifest.ts`, `sw.js`(푸시 수신·클릭 처리), 등록 로직.
   1·7번과 함께 진행(권한 요청 흐름이 서비스워커에 의존).
9. **"AI가 기억하는 내 정보" 화면** (`/settings/memory`) — 조회·수정·삭제. `GET /api/preferences`,
   `PUT /api/preferences/:id`, `DELETE /api/preferences/:id` 연동.
10. **대화 히스토리 목록 화면** (`/conversations`) — `GET /api/conversations`,
    `GET /api/conversations/:id/messages` 연동.
11. **개인정보 처리방침 페이지** (`/privacy-policy`) — 정적 페이지. 법률 검토된 문구 확정 후
    콘텐츠만 채운다(구조는 이번에 만든다).

### 순서 제안

1 → 2 → 3 → 4 → (5, 6 병렬 가능, 파일 겹치지 않음) → (7, 8 함께) → 9, 10(각각 병렬 가능,
파일 겹치지 않음) → 11.

## 테스트 방법

각 작업 단위의 테스트는 [[anyang-frontend-screens#테스트 방법]]에 이미 기술돼 있다. 여기서는
중복하지 않는다.

## Links

- [[anyang-frontend-screens]]
- [[anyang-backend-api]]
- [[anyang-youth-policy-assistant]]
