---
type: design
date: 2026-10-03
status: draft
owner: frontend
---

# 안양 청년정책 비서 — 청안(cheongan) 디자인 적용 조사·설계

## Summary

팀원이 만든 `C:\Users\whwlg\Downloads\cheongan\`(design-system: Tailwind v4 + W3C 토큰, react-prototype: React 19 + Vite
해시 라우터)을 현재 `web/`(Next.js 16 + 순수 CSS)에 적용할 수 있는지 다시 확인하고, 실제로 적용할 때 필요한 작업을
정리한 draft다. 코드·설정·패키지는 건드리지 않았다. 이 문서의 모든 값은 사용자 승인 전이라 `(미확정)`이다.

- 기술적으로는 적용할 수 있다. 버전이 맞고(React 19, Next 16 + Tailwind v4 PostCSS 공식 안내 있음), README에 옮기는 4단계 안내가 있다.
- 기존 `globals.css`는 레이어 밖(unlayered) 순수 CSS라 Tailwind를 추가해도 프리플라이트가 기존 화면을 크게 깨뜨리지는 않는다(코드 근거, 브라우저 확인은 못 함). 반대로 Tailwind 유틸리티가 `globals.css`의 전역 요소 규칙(`button`, `h1`, `a`, `fieldset`)에 져서 안 먹는 문제가 생긴다. 점진 이행에는 이 규칙들을 정리해야 한다.
- 청안 화면 6개 중 `/chat`, `/notices`, `/notices/[id]`는 기존 라우트와 1:1이고 기존 API로 충분하다. 나머지에는 기존 승인 설계를 바꿔야 하는 부분이 있다: 하단 탭 3개에서 4개로, "내 정보" 합쳐진 화면, 공지 본문 이미지 수(`image_count`) 부재, 받는 기기 목록 API 부재.
- 따라서 이 문서는 "적용 가능 여부와 작업 목록" draft이고, 구현은 승인된 설계가 바뀐 뒤(재승인)에 시작한다.

## Context

- 요청: [[anyang-youth-policy-assistant]] 확인 항목 49. frontend 구현은 확인 항목 47 때문에 보류 상태이며, 팀원 소스를 채택하면 web+app 설계를 다시 시작한다.
- 기존 승인 설계: [[anyang-frontend-screens]], [[anyang-frontend-tasks]]. 이 문서는 그것들을 고치지 않는다. 필요한 변경은 아래에서 "설계 변경 필요"로만 표시한다.
- API 계약: [[anyang-backend-api]]. 이번 단계에서 backend는 호출하지 않았다. 신규 API 필요 여부는 표시만 한다.

## Details

### 1. 재확인 결과

#### 1-1. 버전과 의존성

| 항목 | web (현재) | cheongan react-prototype | 비고 |
|---|---|---|---|
| React / react-dom | 19.3.0 | ^19.3.0 | 동일 계열 |
| 빌드 도구 | Next.js 16.3.6 (Turbopack, `output: "standalone"`) | Vite ^8.3.2 + `@vitejs/plugin-react` | 번들러가 달라 Vite 플러그인(`@tailwindcss/vite`)은 못 쓴다 |
| TypeScript | 5.9.3 | ^7.0.2 | web 쪽을 올릴 필요는 없다. 복사한 컴포넌트가 5.9에서 컴파일되는지는 확인 못 함 |
| Tailwind | 없음 | tailwindcss ^4.3.3 (설치본 4.3.3) | web에는 `tailwindcss`, `@tailwindcss/postcss` 추가 필요 |
| 라우터 | App Router | 직접 만든 해시 라우터(`lib/route.ts`) | App Router로 교체 |
| 테스트 | vitest 5.0.2 (`npm test` = `vitest run`, 로직 위주) | 없음 | 아래 6절 |
| Node | web 요구 버전은 `package.json`에 명시 없음 | 20.19 이상 또는 22.12 이상 | `build-tokens.mjs`는 Node 18+ (확인: design-system README) |

web `package.json` 기준으로 Tailwind·PostCSS 관련 의존성은 현재 0개다.

#### 1-2. README "Next.js로 옮길 때" 4단계

1. `src/components`를 복사하고 `app/globals.css`에 `@import "tailwindcss";`와 `design-system/tailwind.css`를 import.
2. 상태를 쓰는 파일(`Chat.tsx`, `Controls.tsx`, `lib/interests.tsx`, `screens/*`) 맨 위에 `"use client";`.
3. 해시 라우터를 App Router 경로(`/chat`, `/notices`, `/notices/[id]`, `/alerts`, `/me`)로 교체하고 `<a href>`는 `next/link`로.
4. `data/` 샘플을 API 호출로 교체. 필드는 팀원의 「청안 화면 기능 정의서 v0」 "데이터" 열에 있다(이 문서는 받은 폴더에 없어 확인 못 함).

이 안내는 "컴포넌트 복사 + 경로 교체"가 전부다. 아래 항목은 이 안내가 다루지 않는 것들이다: web의 기존 CSS와의 충돌, 폰트 로딩, 기존 라우트와 이름이 다른 점(`/alerts`, `/me`), 인증·동의·온보딩 가드, 실제 API 연결, 프로토타입 전용 요소(390x844 틀·사이드바) 제거.

#### 1-3. 못 읽은 것 (확인 못 함)

- `Icon.tsx`, `lib/format.ts`, `samples/` JSON, `tokens.json`, `build-tokens.mjs`는 열어 보지 않았다. 아이콘 15개의 출처·라이선스는 확인 못 함.
- 「청안 화면 기능 정의서 v0」는 받은 폴더에서 확인하지 못했다.

### 2. Tailwind v4 도입 영향

#### 2-1. 필요한 패키지와 설정 (공식 문서 확인됨)

Next 16.3.6 번들 문서(`01-app/01-getting-started/11-css.md`)와 cheongan에 설치된 tailwindcss 4.3.3 기준:

- 패키지 추가: `tailwindcss`, `@tailwindcss/postcss` (devDependencies 위치는 문서 기준)
- `web/postcss.config.mjs` 신규: `@tailwindcss/postcss` 플러그인 1개
- CSS 진입점에 `@import "tailwindcss";` (프로토타입은 `src/index.css`에서 `@import "tailwindcss"; @import "../../design-system/tailwind.css";`)
- Turbopack은 PostCSS 설정을 지원한다. 대신 프로토타입이 쓰는 `@tailwindcss/vite`는 쓰지 않는다.
- design-system 폴더를 `web/` 밖에서 import하는 것이 Turbopack에서 되는지는 확인 못 함. 안전한 안은 `web/` 안으로 복사하는 것이다(원본 `tokens.json` -> 생성물 `tokens.css`, `tailwind.css`, `tokens.ts` 구조 유지 여부는 3절 선택지에서 정한다).

#### 2-2. 프리플라이트(리셋)가 기존 `globals.css`에 미치는 영향

근거: cheongan에 설치된 `tailwindcss/index.css` 4.3.3은 `@layer theme, base, components, utilities;`를 선언하고 프리플라이트를 `base` 레이어에 넣는다. 반면 `web/app/globals.css`(638줄)는 레이어 없이 쓰였다. CSS 캐스케이드에서 레이어 밖 규칙은 레이어 안 규칙보다 항상 이긴다(우선순위 점수와 무관). 아래는 이 규칙에 따른 코드 근거 추론이며, 브라우저 실행으로는 확인 못 함.

프리플라이트가 바꾸는 것(설치본 `preflight.css`에서 읽음): `*{margin:0;padding:0;border:0 solid}`, 제목 `font-size/font-weight: inherit`, `a{color:inherit;text-decoration:inherit}`, `ol/ul{list-style:none}`, `img/svg{display:block}`, 폼 컨트롤 `font:inherit; border-radius:0; background-color:transparent`, `textarea{resize:vertical}`, `[hidden]{display:none !important}`, `html{line-height:1.5}`.

| 영향 | 내용 | 정도 |
|---|---|---|
| 기존 규칙이 이기는 경우 | `globals.css`가 직접 지정한 `button`, `h1`, `a`, `fieldset`, `.card`, `.field` 등의 속성은 프리플라이트를 이긴다 | 화면이 깨질 가능성은 낮다 |
| 프리플라이트만 적용되는 경우 | `globals.css`가 지정하지 않은 속성(예: 제목의 기본 굵기·크기, 목록 점, `img` 표시 방식, `<table>` 테두리)은 프리플라이트 값으로 바뀐다 | 관리자 화면 `<table>` 4곳과 `privacy-policy` 같은 본문 화면은 눈으로 확인이 필요하다 (확인 못 함) |
| 유틸리티가 지는 경우 | Tailwind 유틸리티(`layer(utilities)`)는 레이어 밖 `globals.css`에 진다. 같은 요소에 `className="bg-paper"`를 줘도 `globals.css`의 `button { ... }`가 같은 속성을 지정하면 유틸리티가 무시된다 | 점진 이행의 핵심 위험. 복사한 컴포넌트가 `button`, `h1`, `a`를 쓰므로 반드시 부딪친다 |

`globals.css` 전역 요소 규칙(검색으로 확인된 것): `button`, `h1`, `a`, `fieldset`. 이 규칙들이 유틸리티를 덮는지 컴포넌트별로 확인이 필요하다.

#### 2-3. 토큰 이름 충돌

| 이름 | web `globals.css` | cheongan 토큰 | 판정 |
|---|---|---|---|
| `--border-strong` | `var(--zinc-300)` (색) | `2px` (두께) | 같은 이름, 다른 종류. 한쪽을 바꿔야 한다. 같은 `:root`에 둘 다 두면 나중에 선언된 쪽이 이긴다 |
| `--radius-sm` | `6px` | Tailwind 기본 테마에도 `--radius-sm`이 있다(값 다름, 설치본 `theme.css`) | `@theme`에서 덮어쓰는 방식과 `globals.css` 값 중 어느 것이 이기는지는 레이어 규칙상 `globals.css`(`:root`는 레이어 밖)로 추론되나 확인 못 함 |
| 팔레트 | `--accent #2563eb` + zinc 계열 | `--color-accent #1F4A7C` + paper/ink 따뜻한 팔레트 | 이름은 달라 충돌하지 않지만 팔레트가 둘이 되어 한 화면에 색 체계가 섞인다 |
| 본문 글꼴 | `system-ui` | Hahmlet(제목), IBM Plex Sans KR(본문), IBM Plex Mono(메타) | 글꼴 확정이 필요하다 |
| 다크 모드 | `globals.css`에 `prefers-color-scheme`·`dark` 규칙이 없고 [[anyang-frontend-screens]]에도 다크 모드 언급이 없다(검색 확인) | 청안 토큰에도 없음 | 충돌 없음. 다크 모드는 양쪽 모두 범위 밖이다 |

#### 2-4. 공존 선택지

| 안 | 내용 | 장점 | 단점 |
|---|---|---|---|
| A. 전면 교체 | `globals.css`를 지우고 Tailwind + 토큰으로 모든 화면을 다시 만든다 | 색·글꼴 체계가 하나. 충돌이 사라진다 | `page.tsx` 19개(관리자 포함)의 화면을 한 번에 손대야 한다. `consent-form`, `privacy-policy`의 문구 테스트가 걸린 파일까지 건드린다 |
| B. 점진 이행 | `globals.css`를 유지하고 Tailwind를 추가한다. 새 화면부터 유틸리티를 쓴다 | 화면 단위로 나눠 커밋·확인할 수 있다 | 2-2의 "유틸리티가 지는 경우"를 해결해야 한다(전역 요소 규칙 삭제 또는 `globals.css`를 레이어 안으로 이동). 팔레트가 한동안 둘이다 |
| C. 프리플라이트 끄기 | `theme`와 `utilities`만 가져오고 프리플라이트는 import하지 않는다 | 기존 화면의 리셋 의존이 그대로다 | 설치본에 `theme.css`, `preflight.css`, `utilities.css`가 따로 있는 것은 확인했으나, 공식 문서가 이 방식을 안내하는지 확인 못 함. 청안 컴포넌트는 프리플라이트 리셋을 전제로 만들어졌을 가능성이 있다(확인 못 함) |
| D. 레이어 분리 | 기존 CSS를 `@layer components` 안으로 옮겨 유틸리티가 이기게 한다 | 유틸리티가 항상 기존 클래스를 이긴다. 원본 클래스명 유지 | `globals.css` 한 번의 구조 변경이 필요하다. 기존 규칙이 프리플라이트(`base`)보다 약해지는 쪽이 아니고 강한 쪽(`components` > `base`)이라 화면 변화는 작다고 추론되나 확인 못 함 |

제안(미확정): 적용 순서로 D를 먼저 하고(전체 `globals.css`를 `@layer components`로 이동, 충돌 토큰 이름 정리) 그 위에서 B처럼 화면 단위로 청안 컴포넌트를 들이고, 마지막에 사용처가 사라진 클래스를 지운다. 이유는 화면 단위 커밋과 단계별 `npm run build` 검증이 가능하기 때문이다. 단, 이 제안은 사용자 확정이 필요하다 `(미확정)`.

### 3. 화면 매핑

#### 3-1. 청안 화면과 기존 라우트

| 청안 화면 | 기존 안양 비서 라우트 | 필요한 API | 기존 API로 충분한가 | 비고 |
|---|---|---|---|---|
| 01 대화 (`#/chat`) | `/chat` | `POST /api/chat`(SSE, `event: citations`), `/api/conversations` | 충분 | `chat-client.tsx`를 `Chat.tsx`, `SourceList.tsx` 기반으로 교체. 인용 카드 필드는 `{id,title,source_url,posted_at}`. 청안의 `context`(나이대·상태 기준 표시)는 `GET /api/profile`로 만들 수 있음(서버가 보내는 값 아님) |
| 02 공지 목록 (`#/notices`) | `/notices` | `GET /api/notices/recommended`, 관심사 개수는 `GET /api/preferences` | 충분 | 추천 응답은 `{id,title,excerpt,posted_at}`. "관심사 N개" 표시용으로 preferences 조회 필요. 관심사 0개일 때 "최근 공지"로 바뀌는 동작은 현재 추천 API의 0개 처리와 맞는지 확인 못 함 |
| 03 공지 상세 (`#/notices/452591`) | `/notices/[id]` | `GET /api/notices/:id` | 일부 부족 | 이미지 배지·안내(`ImageBadge`, `ImageNote`)는 본문 이미지 수가 필요한데 응답에 `image_count`가 없다. 확인 항목 24(OCR 보류)와 연결된다. **설계 변경 필요**(backend, database) |
| 04 알림 / 05 알림 홈 화면 추가 전 | `/settings/notifications` (경로명이 다르다: 청안은 `/alerts`) | `GET/PUT /api/notify-settings`, `POST/DELETE /api/push/subscribe` | 일부 부족 | 스위치·받을 시각은 충분. "받는 기기" 목록은 구독 조회 API(GET)가 없다(push API는 POST/DELETE뿐). **설계 변경 필요**(backend). iOS "홈 화면 추가 전" 상태는 클라이언트의 display-mode 검사로 만들고, 현재 코드에는 그 검사가 없다(`manifest.ts`만 있음). 받을 시각 시트는 프로토타입에도 없어 `<input type="time">`을 유지 `(미확정)` |
| 06 내 정보 (`#/me`) | `/settings/memory` + `/settings/account` + 프로필 + `/conversations` + `/privacy-policy` + 로그아웃 + 탈퇴 | `GET/PUT /api/profile`, `/api/preferences` (GET/PUT/DELETE), `DELETE /api/account`, `signOut` | 충분(API 기준) | 한 화면에 합친 새 구성이다. 화면 구조가 승인 설계와 다르다. **설계 변경 필요**(frontend 설계 [[anyang-frontend-screens]]의 하단 탭 3개(채팅, 공지 피드, 설정) -> 4개) |

#### 3-2. 한쪽에만 있는 화면

| 쪽 | 화면·요소 | 처리 |
|---|---|---|
| 안양 비서에만 있음 | `/login`, `/consent`, `/onboarding`, `/suspended`, `/conversations`(청안은 기록 아이콘 버튼만 있음), `/privacy-policy` 본문, `/admin/*` 4개 | 청안 디자인이 없다. 토큰·공통 컴포넌트만 입히는 범위인지, 별도 시안을 받아야 하는지 `(미확정)` |
| 청안에만 있음 | 4개 탭(공지, 대화, 알림, 내 정보), 관심사 삭제 후 5초 되돌리기(Toast), 홈 화면 추가 안내, 휴대폰 틀·사이드바(프로토타입 전용) | 4개 탭과 되돌리기는 설계 변경. 되돌리기에 필요한 API(삭제 취소)는 없다. 클라이언트에서 삭제를 5초 뒤로 미루는 방식이면 API 변경 없이 가능하나 확정 필요 `(미확정)`. 틀·사이드바는 가져오지 않는다 |

### 4. 확인 항목 47과의 관계

- 47(b) 기억 화면 진입 경로: 청안 "내 정보" 탭이 `/settings/memory`로 가는 길을 자연스럽게 만들어 이 적용에서 함께 해결된다. 단 하단 탭 4개 구성은 승인 설계 변경이다.
- 47(c) 프론트 버그 ①~⑤: ①②③은 이 적용이 어차피 다시 쓰는 파일(`chat-client.tsx`, `notices-list.tsx`, `notice-detail.tsx`)이라 함께 처리하는 것이 효율적이다. ④(manifest 아이콘)와 ⑤(가입 동의 마스크 안내)는 청안 적용과 무관하게 독립적으로 처리할 수 있다. 아이콘 자산은 청안 폴더에도 없다.

### 5. 작업 목록 (실행하지 않음, 순서)

| 순서 | 작업 | 수정·추가 파일 | 비고 |
|---|---|---|---|
| 0 | 사용자 확인: 공존 안(2-4), 글꼴, 탭 4개, 한쪽에만 있는 화면의 범위 | 이 문서 | 승인 후 `(미확정)` 제거 |
| 0-1 | 설계 변경 반영: 승인 설계의 하단 탭, 설정 화면 구조 | [[anyang-frontend-screens]], [[anyang-frontend-tasks]] | pm이 "승인된 설계"에서 빼고 재승인 |
| 0-2 | backend 조율: `image_count` 추가 여부, 구독 조회 GET API | [[anyang-backend-api]] (backend 소유) | 필요 없으면 해당 UI를 빼는 안도 있음 `(미확정)` |
| 1 | Tailwind 설치 | `web/package.json`, `web/package-lock.json`, `web/postcss.config.mjs`(신규) | 사용자 승인 후. 파일 추가 |
| 2 | 토큰 복사·충돌 정리 | `web/app/_styles/`(신규 위치 `(미확정)`)에 청안 `tailwind.css`, `tokens.css`; `web/app/globals.css`의 `--border-strong` 이름 변경 | 원본 `build-tokens.mjs`, `tokens.json`을 가져올지 `(미확정)` |
| 3 | `globals.css` 레이어 이동 + `@import "tailwindcss"` | `web/app/globals.css`, `web/app/layout.tsx` | 이 단계 직후 모든 기존 화면 수동 확인 |
| 4 | 폰트 로딩 | `web/app/layout.tsx` (`next/font/google` 사용 시 `variable` 이름을 토큰 `--font-*`에 맞춤). 한국어 서브셋 지원 여부는 확인 못 함 | 공식 문서는 자체 호스팅·빌드 시 다운로드를 설명한다 |
| 5 | 공통 컴포넌트 복사 + `"use client"` | `web/app/_components/`에 `Icon`, `Screen`, `Controls`, `Chat`, `SourceList`, `NoticeRow`, `TabBar` | 프로토타입 전용 틀·사이드바 제외 |
| 6 | 탭 구조 교체 | `web/app/_components/bottom-nav.tsx`, `web/app/(tabs)/layout.tsx` | 설계 변경 승인 후 |
| 7 | 화면 단위 이행, 단위마다 빌드·확인·커밋: `/notices` -> `/notices/[id]` -> `/chat` -> `/settings/notifications` -> 내 정보 | 각 `*-client.tsx`, `notices-list.tsx`, `notice-detail.tsx` 등 | 47(c) ①②③ 포함 |
| 8 | 기존 CSS 정리 | `web/app/globals.css` | 사용처가 사라진 클래스만 삭제(삭제는 사용자 승인) |

### 6. 테스트 방법

- `npm test`(`vitest run`)는 로직 테스트 위주이고 컴포넌트 렌더 테스트가 없다. className 변경은 테스트로 걸리지 않는다. 그래서 각 단계 후 `npm run build` + 수동 화면 확인(실행해서 주요 흐름 확인)이 필요하다. 구현 단계에서 확인하지 못했으면 못 했다고 보고한다.
- 문구 테스트: `web/test/consent-privacy-wording.test.ts`가 `app/consent/consent-form.tsx`, `app/privacy-policy/page.tsx`, `app/(tabs)/settings/memory/memory-client.tsx`를 파일 경로로 읽어 금지 문자열과 고정 문구(예: "이름이나 호칭 같은 사실을 기억해", "AI가 기억하는 내 정보")를 검사한다. 파일을 이동·이름 변경하면 테스트가 깨지므로, 이 파일들의 이동·분리 시 테스트 경로를 같이 고친다(문구 자체는 바꾸지 않는다). 내 정보 화면으로 합칠 때 고정 문구가 `memory-client.tsx`에 남아 있어야 하는지 새 파일로 옮기는지 `(미확정)`.
- 추가 테스트 후보: 청안 `ageBand`는 `19~24세` 형식(web `lib/age-band.ts`는 `19~24`)이라 라벨이 다르다. 화면 표시용이면 별도 함수로 두고 web 쪽 AI 전달용 라벨은 바꾸지 않는다(안양 백엔드 계약에 닿으므로 변경 금지). 단위 테스트는 표시용 함수를 만들 때 추가한다 `(미확정)`.
- 접근성: 청안은 터치 영역 44px(`h-touch`), 스위치 `aria-labelledby`를 쓴다. 복사 후에도 유지되는지 수동 확인.

### 7. 미확정 값과 열린 질문

1. 공존 안(2-4 A/B/C/D) `(미확정)`.
2. 본문 글꼴(IBM Plex Sans KR, Pretendard 등)과 로딩 방식 `(미확정)`.
3. 하단 탭 3개 -> 4개 `(미확정)`, 한쪽에만 있는 화면(로그인·동의·온보딩·관리자 등)에 청안 디자인을 입힐 범위 `(미확정)`.
4. `image_count`, 구독 조회 GET API 필요 여부 `(미확정)`, 설계 변경 필요(backend).
5. 되돌리기 Toast의 구현 방식(클라이언트 지연 삭제) `(미확정)`.
6. 토큰 폴더 위치와 `build-tokens.mjs` 포함 여부 `(미확정)`.
7. 확인 못 함: 브라우저에서의 프리플라이트·레이어 우선순위 실제 동작, `web/` 밖 폴더 import, `next/font`의 한국어 서브셋, 청안 컴포넌트의 TS 5.9 컴파일, 프리플라이트 단독 비활성화의 공식 문법.

## Links

- [[anyang-youth-policy-assistant]] — 프로젝트 문서, 확인 항목 47, 49
- [[anyang-frontend-screens]] — 승인된 화면 설계(이 문서가 고치지 않음, 변경 필요 시 재승인)
- [[anyang-frontend-tasks]] — 승인된 작업 문서
- [[anyang-backend-api]] — API 계약(신규 API 필요 여부만 표시, 호출하지 않음)
