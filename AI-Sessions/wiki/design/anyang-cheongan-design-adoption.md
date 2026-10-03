---
type: design
date: 2026-10-03
status: active
owner: frontend
---

# 안양 청년정책 비서 — 청안(cheongan) 디자인 웹 적용 설계

## Summary

팀원 디자인 소스 `C:\Users\whwlg\Downloads\cheongan\`(design-system: Tailwind v4 + W3C 토큰, react-prototype: React 19 + Vite
해시 라우터)를 `web/`(Next.js 16.3.6 + React 19, PWA)에 **반응형 웹**으로 적용하는 설계 draft다(확인 항목 52). 코드·설치·파일 복사는
하지 않았다. 설계 단계 문서이며 구현은 사용자 재승인 뒤에 시작한다.

- 사용자 확정(2026-10-03, 메인 세션 전달): 웹(PWA)만(Expo·React Native 앱 없음), 청안 `tokens.json`·`tokens.css`·`tailwind.css`는 그대로 가져와 쓰고 컴포넌트는 새로 작성, 반응형 모바일 390 / 태블릿 768 / 데스크톱 1200(데스크톱은 사이드바).
- 그 밖의 값은 모두 제안이다. 권장안은 프로젝트 문서 확인 항목 52 (c)에 있고, 이 문서는 그것을 구체화했다.
- 핵심 설계: 토큰은 `web/design-system/`에 원본 그대로 두고, `globals.css`는 `@layer components`로 옮겨 Tailwind 유틸리티가 이기게 하며, 옛 의미 토큰(`--accent`, `--bg` 등)을 청안 토큰으로 다시 가리켜 시안 없는 화면도 한 번에 같은 팔레트가 되게 한다. 화면은 단위별로 이행한다.
- API 변경 없음: `image_count` 배지와 알림 "받는 기기" 목록은 뺐고 기존 API만 쓴다. backend·database 설계 변경이 필요하지 않다고 판단했다.

화면별 스펙은 [[anyang-frontend-screens]]의 "청안 디자인 적용 화면 스펙" 절, 작업 순서·파일·테스트는 [[anyang-frontend-tasks]]의 "청안 디자인 적용" 절에 있다. 이 문서는 토큰·공존·글꼴·반응형·공통 컴포넌트만 다룬다.

## Context

- 요청 이력: 확인 항목 49(적용 가능성 조사, 보류 후 2026-10-03 해제) → 52(적용 요청, 결정 일부). 49의 조사 결과 중 이 설계에 필요한 사실만 아래에 남겼다.
- 49 해제 이후 달라진 것: 청안 폴더에 `Icon.tsx`(직접 그린 선 아이콘 15개, 외부 라이브러리 없음)·`tokens.json`·`build-tokens.mjs`가 있다는 것을 확인했다. 「청안 화면 기능 정의서 v0」는 없어서 프로토타입 코드만 근거로 한다.
- 49에서 "설계 변경 필요"로 표시했던 `image_count`와 구독 조회 GET API는 이번에 해당 UI를 빼므로 필요 없다. 탭 3개 → 4개는 [[anyang-frontend-screens]]에서 직접 바꾼다.
- API 계약: [[anyang-backend-api]] (읽기만 했다. 호출·수정 없음).

## Details

### 1. 확정 값과 제안 값

| 항목 | 값 | 상태 |
|---|---|---|
| 적용 범위 | 웹(PWA)만 | 확정 |
| 토큰 파일 | `tokens.json`·`tokens.css`·`tailwind.css` 그대로 사용 | 확정 |
| 컴포넌트 | 청안 코드를 참고해 새로 작성 | 확정 |
| 반응형 | 390 / 768 / 1200, 데스크톱은 사이드바 | 확정 |
| 공존안 | D(`globals.css`를 `@layer components`로) 후 B(화면 단위 이행) | 확정 |
| 글꼴 | 토큰대로 Hahmlet·IBM Plex Sans KR·IBM Plex Mono, `next/font/google` | 확정 |
| 탭 | 4개(대화·공지·알림·내 정보). 순서는 10절 3번 | 확정 |
| 시안 없는 화면 | 토큰·공통 컴포넌트만, 관리자는 가독성·일관성만 | 확정 |
| 되돌리기 | 클라이언트에서 삭제 요청을 5초 늦춤 | 확정 |
| 토큰 위치 | `web/design-system/` | 확정 |
| 반응형 세부(태블릿 레이아웃, 사이드바 항목, 콘텐츠 최대폭) | 6절 | 확정 |

### 2. 재확인한 사실 (코드·설치본 근거)

- 버전: web은 React 19.3.0·Next 16.3.6(Turbopack, `output: "standalone"`), TypeScript 5.9.3, vitest 5.0.2. 청안 프로토타입은 React ^19.3.0, Tailwind ^4.3.3, Vite. web에는 Tailwind·PostCSS 의존성이 없고 `postcss.config.*`도 없다.
- 프로토타입이 쓰는 `@tailwindcss/vite`는 못 쓴다. Next에서는 `tailwindcss`와 `@tailwindcss/postcss`를 추가하고 `postcss.config.mjs`에 플러그인 1개를 둔다(Next 번들 문서 `01-app/01-getting-started/11-css.md` 기준).
- 청안 `tailwind.css`는 `@theme`(색·글꼴·글자 크기·모서리·간격 이름)과 `@utility type-*` 9개, `:root`의 `--space-*`·`--border-*`·`--duration-*`를 담는다. `tokens.css`는 같은 값을 `:root` 변수와 `.type-*` 클래스로 담은 일반 CSS다. 둘의 값은 `tokens.json`에서 생성된다(`node build-tokens.mjs`).
- Tailwind v4의 `@theme` 변수는 쓰이지 않으면 출력되지 않는다는 동작을 알고 있으나 이 저장소에서 확인하지 못했다(설치 전이라). 옛 CSS가 `var(--color-ink)`를 쓰려면 변수가 항상 있어야 하므로 3-2절에서 `tokens.css`도 함께 불러온다. 빌드 산출 CSS에서 확인해야 한다(작업 C2).
- 프리플라이트(설치본 4.3.3 기준)는 `base` 레이어에 있고 `globals.css`는 레이어 밖이라 항상 이긴다. 그래서 Tailwind 유틸리티가 `globals.css`의 `button`·`h1`·`a`·`fieldset` 같은 전역 요소 규칙에 진다. 이 추론은 브라우저로는 확인하지 못했다.

### 3. 토큰 통합

#### 3-1. 위치와 가져오는 방법

- 청안 `design-system/` 폴더를 **수정 없이** `web/design-system/`로 복사한다. 이유는 (1) `web/` 밖 폴더를 import하는 것이 Turbopack에서 되는지 확인하지 못했고, (2) README의 `@import "../design-system/tailwind.css"` 경로가 `web/app/globals.css`에서 그대로 맞기 때문이다.
- 복사 대상: `tokens.json`(원본), `tokens.css`, `tailwind.css`, `build-tokens.mjs`, `tokens.ts`, `README.md`. `tokens.ts`는 앱이 없어 쓰이지 않지만 `build-tokens.mjs`가 만들어 내는 파일이라 같이 둔다(빼면 재생성 때 파일이 다시 생긴다).
- 값을 바꿀 때는 청안 README의 규칙대로 `tokens.json`만 고치고 `node build-tokens.mjs`로 다시 만든다. 생성 파일을 손으로 고치지 않는다. 청안 쪽 원본이 바뀌면 같은 폴더를 다시 복사한다.
- 컴포넌트는 복사하지 않는다. `react-prototype/src`는 참고만 한다.

#### 3-2. 가져오는 순서와 설정

`web/app/globals.css` 맨 위(구현 작업 C2):

```css
@import "tailwindcss";
@import "../design-system/tailwind.css";
@import "../design-system/tokens.css" layer(base);
```

- 셋째 줄은 `@theme` 미출력 변수 문제를 막고 옛 CSS(`var(--color-*)`)가 항상 값을 얻게 하려는 것이다. `tokens.css`가 `.type-*` 클래스를 레이어 밖에 정의하면 `text-body font-medium`처럼 유틸리티로 굵기를 바꾸는 청안 README 방식이 깨지므로 `layer(base)`에 넣는다. 이 `layer()` import가 Turbopack에서 되는지, `@theme` 변수가 실제로 안 나오는지는 구현 시 산출 CSS로 확인한다. 안 되면 대안은 옛 CSS의 변수 참조를 `tailwind.css`가 쓰는 변수로만 제한하고 필요한 값만 `globals.css` 안 `@theme static`에 다시 적는 것이다.
- `web/postcss.config.mjs` 신규: `@tailwindcss/postcss` 플러그인 하나.
- `package.json`: `tailwindcss`, `@tailwindcss/postcss` 추가(Next 문서의 위치 안내를 따름). 설치는 사용자 승인된 구현 단계에서 한다.
- 청안 색 말고 다른 색을 막는 `--color-*: initial;`은 켜지 않는다. 옛 CSS가 한동안 `--zinc-*`를 쓰기 때문이다. 옛 CSS 정리(작업 C10) 뒤에 켤지 판단한다.

#### 3-3. 이름 충돌과 옛 토큰 다시 가리키기

| 충돌 | 처리 |
|---|---|
| `--border-strong`: 옛 `globals.css`는 색(`zinc-300`), 청안은 `2px` | 옛 이름을 `--line-strong`으로 바꾼다. 사용처는 `globals.css` 안 3곳뿐이고 tsx에서는 쓰지 않는다(검색 확인) |
| `--radius-sm`: 옛 `6px`, Tailwind 기본 테마에도 같은 이름 | 옛 이름을 `--legacy-radius-sm`으로 바꾼다(사용처 `globals.css` 2곳) |
| 팔레트 두 벌 | 옛 의미 토큰을 청안 토큰으로 다시 가리킨다(아래 표). 옛 zinc 팔레트 변수는 쓰이지 않게 되면 정리 단계에서 지운다 |

옛 의미 토큰 → 청안 토큰(시안 없는 화면 전체의 모습이 바뀐다):

| 옛 | 새 값 | 비고 |
|---|---|---|
| `--bg` | `var(--color-paper)` | |
| `--surface` | `var(--color-surface)` | 옛 body 배경은 `--surface`였으나 청안 body는 paper. body 규칙은 `--bg`를 쓰게 고친다 |
| `--fg` | `var(--color-ink)` | |
| `--muted` | `var(--color-ink-3)` | 글자색 하한 4.7:1을 지키는 값 |
| `--border` | `var(--color-rule)` | |
| `--line-strong` (옛 `--border-strong`) | `var(--color-field)` | 입력 테두리 |
| `--accent`, `--accent-hover`, `--accent-active`, `--accent-fg` | `--color-accent`, `--color-accent-press`, `--color-accent-press`, `--color-on-accent` | |
| `--accent-soft`, `--accent-soft-border` | `--color-surface`, `--color-rule` | 청안 규칙: 색 면 채우기 없음 |
| `--danger`, `--danger-hover`, `--danger-soft` | `--color-danger`, `--color-danger`, `--color-surface` | |
| `--warning-bg`, `--warning-border` | `--color-surface`, `--color-rule` | |
| `--radius` | `var(--radius-control)` (12px) | 옛 10px |
| `--shadow-card`, `--shadow-card-hover` | `none` | 청안 규칙: 그림자 카드 없음 |

옛 `body`의 `font-family`·`font-size`는 `var(--font-sans)`·`var(--text-body)`로, 옛 `h1`은 `font-family: var(--font-display)`로 바꾼다(`@layer base`의 body 규칙으로 옮김).

### 4. 공존안 D 후 B 구체화

1. `globals.css`의 `:root` 변수 선언은 레이어 밖에 둔다(변수는 레이어와 무관하게 이긴다).
2. 나머지 규칙(요소 규칙 `body`·`a`·`h1`·`button`·`fieldset`, `.card`·`.field`·`.bottom-nav`·`.auth-*` 등)은 모두 `@layer components { ... }` 안으로 옮긴다. 선택자·선언은 바꾸지 않는다. `* { box-sizing }`은 프리플라이트가 같은 일을 하므로 지운다.
3. 결과: 유틸리티(`utilities` 레이어)가 항상 옛 클래스를 이기고, 옛 규칙은 프리플라이트(`base`)보다 강하다. 이 순서는 `@layer theme, base, components, utilities;`(Tailwind가 선언)에 따른 추론이다. 브라우저 확인은 작업 C2에서 한다.
4. 새로 만드는 청안 컴포넌트와 이행한 화면은 **유틸리티만** 쓰고 옛 클래스(`.card`, `.field`, `button.secondary` 등)를 쓰지 않는다. 옛 클래스는 이행하지 않은 화면(로그인·동의·온보딩·정지·관리자 등)만 쓴다.
5. 이행이 끝나 쓰이지 않는 옛 클래스는 마지막 작업(C10)에서 지운다. 삭제는 사용자 승인 후에 한다.

A안(전면 교체)은 화면 19개를 한 번에 건드려야 하고, C안(프리플라이트 끄기)은 청안 컴포넌트가 리셋을 전제로 만들어졌을 수 있어 채택하지 않는다. 이유는 49와 같다.

### 5. 글꼴

- 로딩: `next/font/google`로 Hahmlet, IBM Plex Sans KR, IBM Plex Mono를 `web/app/layout.tsx`에서 불러온다. 청안 README 안내대로 `variable`을 `--font-display`, `--font-sans`, `--font-mono`로 주고 `<html>`에 className으로 붙인다. 청안 토큰의 같은 이름 변수를 덮어쓰는 방식이라 별도 매핑 코드가 없다.
- 알려진 한계: `next/font`가 만드는 변수 값에는 토큰이 적어 둔 시스템 대체 글꼴(`AppleMyungjo, serif` 등)이 빠진다. `next/font`가 크기 보정된 대체 글꼴을 자동으로 붙이므로 큰 문제는 아닐 것으로 보나 확인하지 못했다. 문제가 되면 `globals.css`에서 `--font-display: var(--font-hahmlet), AppleMyungjo, serif;`처럼 별도 변수 이름을 쓰는 방식으로 바꾼다(값이 토큰 파일과 두 곳에 생기는 단점).
- 굵기: Hahmlet 500·600, IBM Plex Sans KR 400·500·600, IBM Plex Mono 400·500(청안 README의 Google Fonts 링크와 같은 범위).
- 확인하지 못한 것: Google Fonts의 IBM Plex Sans KR·Hahmlet에 `next/font`의 한국어 `subsets` 값이 있는지, 용량이 얼마인지, 빌드 환경에서 폰트를 내려받을 수 있는지. 구현 시 첫 빌드로 확인하고, 안 되면 사용자에게 보고한다(자체 호스팅 파일 추가는 설계 변경이다).
- 본문 글꼴을 Pretendard로 바꿀지는 청안 정의서의 미확정 항목이라 이번에는 IBM Plex Sans KR로 둔다.
- `word-break: keep-all`과 `text-wrap: pretty`(청안 `index.css`의 base 규칙)는 `globals.css`의 `@layer base`에 넣는다. `:focus-visible` 2px accent 윤곽선도 같이 넣는다(옛 `:focus-visible` 규칙과 같은 취지라 하나로 합친다).
- `viewport`: `themeColor`는 `#F5F3ED`(paper)로, `viewportFit: "cover"`를 추가한다. 청안 화면이 `env(safe-area-inset-*)`를 쓰므로 필요하다. `viewportFit` 키 이름은 구현 시 번들 문서(`node_modules/next/dist/docs`)로 확인한다. `manifest.ts`의 `theme_color`·`background_color`도 같은 값으로 맞춘다. manifest 아이콘(47(c)④)은 이번 범위 밖이다.

### 6. 반응형

기준은 청안 시안 390px이다. 브레이크포인트는 Tailwind v4 기본 `md`(768px = 48rem)가 태블릿과 같아 그대로 쓰고, 데스크톱은 `globals.css`의 `@theme`에 `--breakpoint-desktop: 75rem;`(1200px)을 추가한다 — 유틸리티 이름은 `desktop:`. `sm`·`lg`·`xl`은 쓰지 않는다.

| 구간 | 폭 | 내비 | 콘텐츠 | 근거 |
|---|---|---|---|---|
| 모바일 | 390 기준, 360~767 유동 | 하단 탭 바(4개) | 화면 폭 전체, 좌우 `px-gutter`(20px) | 시안 |
| 태블릿 | 768~1199 | 하단 탭 바 유지 | 가운데 정렬, 최대 폭 720px, 좌우 `px-gutter` | 탭이 4개뿐이라 하단 바로 충분하다. 시안에 없는 구간이라 별도 레이아웃을 새로 만들지 않고 모바일의 중앙 정렬 확장으로 한다 |
| 데스크톱 | 1200 이상 | 왼쪽 사이드바(폭 240px), 하단 탭 바 숨김 | 사이드바 오른쪽 영역 안에서 가운데 정렬, 최대 폭 720px | 요청 |

- 콘텐츠 최대 폭 720px은 `globals.css`의 `@theme`에 `--container-column: 45rem;`으로 두고 `max-w-column`으로 쓴다. 관리자 화면은 표가 많아 `--container-admin: 65rem;`(1040px)을 따로 둔다.
- 사이드바 구성: 맨 위 "청안"(제목 글꼴) → 내비 항목 4개(아이콘 + 라벨, 높이 44px 이상, 현재 항목 accent·semibold·`aria-current="page"`) → 구분선은 `rule`. 항목은 하단 탭과 같은 배열 하나에서 만든다. 관리자 링크는 두지 않는다(관리자 판정은 서버 응답이라 화면 쪽에서 숨기고 보이는 분기를 만들지 않는다). 그 밖의 메뉴(대화 기록, 처리방침, 로그아웃, 탈퇴)는 내 정보 화면에 있다.
- 공지 상세는 모바일·태블릿에서 하단 탭 바를 숨긴다(시안 03). 데스크톱에서는 사이드바가 계속 보인다.
- 화면 틀은 시안과 같이 `h-dvh` 세로 flex, 본문 영역 `overflow-y-auto`, 하단에 탭 바다. 문서 전체 스크롤 방식과의 차이(iOS 주소창 접힘 등)는 구현 시 화면에서 확인한다.
- 이분할(목록 + 상세 동시 표시) 같은 데스크톱 전용 화면 구성은 만들지 않는다. 시안이 없고 라우팅(병렬 라우트)이 필요해 범위를 키운다.
- 로그인 화면의 `auth-*` 반응형(1024px 두 칸)은 그대로 둔다. 브레이크포인트가 1024와 1200으로 다르지만 이번 요청은 로그인 시안이 없는 화면에 대해 토큰만 입히는 범위다.

### 7. 공통 컴포넌트와 재사용 계획

위치: `web/app/_components/ui/`(신규), 내비는 `web/app/_components/app-nav.tsx`(신규). 청안 코드는 참고만 하고 새로 쓴다. 파일 수를 줄이려고 청안처럼 관련된 것을 한 파일에 둔다. 클래스는 청안과 같이 토큰 유틸리티(`bg-accent`, `h-touch`, `rounded-control`, `type-*`)를 쓴다.

| 컴포넌트 | 파일 | 청안 참고 | 쓰는 화면 | 안양 쪽 변경점 |
|---|---|---|---|---|
| `Icon`, `IconButton` | `ui/icon.tsx` | `Icon.tsx` (15개: chat·notices·bell·person·history·plus·send·chevron-right/left·external·image·phone·share·pencil·trash) | 전부 | 모양은 청안과 같게 그린다. `image`·`phone`은 이번에 쓰이지 않으므로 만들지 않는다 — 13개 |
| `Button`, `buttonClass` | `ui/controls.tsx` | `Controls.tsx` | 이행한 화면, 탈퇴 다이얼로그, 원문 보기 | `Link`에 같은 모양을 입히려고 `buttonClass`를 내보낸다 |
| `Switch` | `ui/controls.tsx` | 같음 | 알림 | 접근성 속성(`role="switch"`, `aria-labelledby`·`describedby`) 유지 |
| `SettingsGroup` | `ui/controls.tsx` | 같음 | 알림, 내 정보 | |
| `Toast` | `ui/controls.tsx` | 같음 | 내 정보(되돌리기), 알림·메모리 오류 안내 | `position: absolute`는 `fixed`로 바꿔 사이드바 레이아웃에서도 콘텐츠 열 아래에 뜨게 한다 |
| `ScreenHeader` | `ui/screen.tsx` | `Screen.tsx` | 탭 화면 | 청안 `Screen`(틀 + 탭 바)은 `AppShell`로 나눈다 |
| `AppShell` | `app/(tabs)/layout.tsx`가 사용 | `Screen.tsx` + 프로토타입 `App.tsx`의 틀 | (tabs) 전체 | 휴대폰 틀(390×844)·화면 바로가기 사이드바는 가져오지 않는다. 사이드바는 6절의 새 요소다 |
| `TabBar`, `Sidebar` | `app-nav.tsx` | `TabBar.tsx` | (tabs) 전체 | `<a href>`를 `next/link`로, 현재 탭 판정을 `usePathname()`으로. 항목 배열 하나를 둘이 공유 |
| `MessageBubble`, `AnswerBlock`, `Composer` | `ui/chat.tsx` | `Chat.tsx` | `/chat` | 입력 키 처리 등 현재 `chat-client.tsx`의 동작은 유지하고 외형만 바꾼다. `Cite`는 만들지 않는다(8절) |
| `SourceList` | `ui/chat.tsx` | `SourceList.tsx` | `/chat` | 필드 `{id, title, posted_at}`. 링크는 `/notices/[id]` |
| `NoticeRow` | `ui/notice-row.tsx` | `NoticeRow.tsx` | `/notices` | `ImageBadge`·`ImageNote`는 만들지 않는다 |
| 입력·선택 | 옛 `.field` 유지 | (청안에 입력 컴포넌트 없음, `Composer` 입력과 `EditInterest` 텍스트 영역만 있음) | 로그인·동의·온보딩 | 이번에 새 컴포넌트를 만들지 않는다. 옛 클래스가 토큰 다시 가리키기로 같은 모습을 얻는다 |
| 사이드바, `AppShell` | 위 | — | — | **청안에 없어 새로 추가하는 것** |
| 확인 다이얼로그(`<dialog>`) | `ui/controls.tsx`의 `ConfirmDialog` | `MemoryScreen.tsx`의 탈퇴 `<dialog>` | 계정 탈퇴 | 관리자 화면의 `window.confirm`(`admin/_lib/confirm.ts`)은 그대로 둔다 |

재사용: 같은 컴포넌트를 여러 화면이 쓰는 곳은 `Button`·`Icon`·`SettingsGroup`·목록 행 패턴이다. 목록 행 패턴(제목 + 보조 줄 + 날짜, 아래 `rule` 선)은 `NoticeRow`와 `/conversations` 행이 같은 클래스 구성을 쓴다(컴포넌트로 합치지 않고 클래스만 맞춘다, 쓰는 곳이 둘뿐이라).

### 8. 청안에서 가져오지 않는 것과 바꾼 것

| 청안 요소 | 처리 | 이유 |
|---|---|---|
| 본문 이미지 배지(`ImageBadge`)·이미지 안내(`ImageNote`) | 뺀다 | 공지 응답에 `image_count`가 없다([[anyang-backend-api]]). backend·database 설계 변경이 필요해 이번에는 하지 않는다 |
| 알림 "받는 기기" 목록 | 뺀다 | 구독 조회 GET API가 없다. 같은 이유 |
| 답변 속 인용 번호 `<Cite n>` | 만들지 않는다 | 답변은 DeepSeek 스트림 일반 텍스트이고 인용 번호 규약이 없다. 번호를 넣으려면 backend 프롬프트 계약이 바뀌므로 이번에 하지 않는다. 근거 카드의 번호(1, 2, 3)는 표시한다 |
| 알림 "받을 시각" 시각 선택 시트 | 네이티브 `<input type="time">`을 유지 | 시안에도 시트가 없고 기존 승인 설계가 네이티브 입력이다 |
| 프로필 "수정" 버튼 | 뺀다 | 시안에서도 동작이 없다. 프로필 수정은 기존 승인 설계에 없는 새 기능이다(API는 `PUT /api/profile`로 있음) |
| 휴대폰 틀 390×844, 프로토타입 바로가기 사이드바 | 가져오지 않는다 | 프로토타입 전용 요소 |
| 프로토타입 `data/` 샘플 | 가져오지 않는다 | 실제 API로 대체 |
| 청안 "AI에는 …이름과 이메일은 보내지 않아요" 문장 | 쓰지 않는다 | 확인 항목 43에서 이름·호칭 기억·전송이 예외로 허용되어 "이름은 보내지 않는다"가 사실과 다르다. 화면 스펙의 문구 규칙 참고 |

### 9. 테스트 방법 요약

상세는 [[anyang-frontend-tasks]]. 요약:

- `npm test`: 로직만 검사한다. className 변경은 걸리지 않으므로 `consent-privacy-wording.test.ts`가 읽는 세 파일(`app/consent/consent-form.tsx`, `app/privacy-policy/page.tsx`, `app/(tabs)/settings/memory/memory-client.tsx`)의 경로와 고정 문구가 유지되는지 확인한다.
- 새 로직(탭 판정, iOS 홈 화면 추가 전 판정, 5초 지연 삭제)에는 vitest 테스트를 추가한다.
- `npm run build` 후 산출 CSS에서 청안 토큰 변수와 `desktop:` 브레이크포인트 유틸리티가 나오는지 확인한다.
- 화면은 실제로 실행해 390 / 768 / 1200 폭에서 주요 흐름을 확인한다. 로그인·DB가 필요한 화면을 못 열었으면 못 했다고 보고한다.

### 10. 미확정 값과 열린 질문

1. 공존안 D 후 B.
2. 글꼴 3종·`next/font/google` 로딩, 본문을 Plex Sans KR로 두는 것.
3. 하단 탭 4개와 순서. 프로젝트 문서 확인 항목 52 (c)는 "공지·대화·알림·내 정보"로 적었으나 청안 프로토타입 `TabBar.tsx`의 순서는 대화·공지·알림·내 정보다. 이 설계는 프로토타입 순서를 제안한다([[anyang-frontend-screens]]의 "공통 틀" 참고). 기본 진입 화면은 지금처럼 `/chat`이다.
4. 시안 없는 화면의 처리 범위(토큰 다시 가리키기로 모습이 바뀜).
5. 되돌리기 5초 지연 삭제.
6. 토큰 위치 `web/design-system/`, 포함 파일 6개.
7. 반응형 세부: `--breakpoint-desktop`, 태블릿 레이아웃, 사이드바 구성, 콘텐츠 최대 폭 720px·관리자 1040px, `viewportFit: "cover"`, `themeColor`.
8. `image_count` 배지·"받는 기기" 목록을 뺀다는 결정. 넣으려면 backend(필요 시 database) 설계부터 해야 한다.
9. 확인하지 못한 것: 브라우저에서의 레이어 우선순위·프리플라이트 실제 동작, `tokens.css`를 `layer(base)`로 import하는 문법의 Turbopack 동작과 `@theme` 변수 미출력 여부, `next/font`의 한국어 서브셋·용량, `next/font` 변수가 토큰 시스템 대체 글꼴을 가리는 영향, 청안 아이콘 path 그대로 쓰는 것의 문제 여부(팀 자체 제작 자산이라 라이선스 문제는 없을 것으로 보나 확인하지 못함), 「청안 화면 기능 정의서 v0」(없음).

## Links

- [[anyang-youth-policy-assistant]] — 프로젝트 문서, 확인 항목 47·49·52
- [[anyang-frontend-screens]] — 화면별 스펙(이 문서가 갱신하는 짝 문서)
- [[anyang-frontend-tasks]] — 구현 작업 단위·순서·테스트
- [[anyang-backend-api]] — API 계약(읽기만 함, 변경 없음)
- [[glossary]] — 용어
