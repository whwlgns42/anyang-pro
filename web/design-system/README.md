# 청안 디자인 시스템 v0 — 코드용 토큰

색·글꼴·간격·모서리·움직임 값을 코드로 옮긴 폴더예요. 어떤 언어를 쓰든 `tokens.json`이 원본이고, 웹에서 바로 쓸 파일 3개는 거기서 자동으로 만들어요.

| 파일 | 쓰는 곳 |
| --- | --- |
| `tokens.json` | 원본. 어떤 언어·도구든 읽을 수 있어요 (W3C Design Tokens의 `$value`·`$type` 구조) |
| `tokens.css` | 웹, 프레임워크 상관없이. CSS 변수 + `type-*` 글자 클래스 |
| `tailwind.css` | Tailwind CSS v4 (Next.js 새 프로젝트 기본). v4.3.3으로 컴파일 확인 |
| `tokens.ts` | JavaScript · TypeScript · React Native |
| `build-tokens.mjs` | `tokens.json` → 위 3개 파일 생성. Node 18 이상, 설치할 패키지 없음 |

## 글꼴 불러오기

세 글꼴 모두 Google Fonts에 있는 무료 글꼴(OFL)이에요.

```html
<link href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet">
```

Next.js라면 `next/font/google`로 불러와도 돼요. 이때 글꼴 이름은 `--font-display`, `--font-sans`, `--font-mono` 값과 맞춰 주세요.

## 쓰는 법

### Next.js + Tailwind CSS v4

```css
/* app/globals.css */
@import "tailwindcss";
@import "../design-system/tailwind.css";
```

```tsx
<a className="flex h-touch items-center rounded-control bg-accent px-gutter text-on-accent type-title hover:bg-accent-press">
  원문 보기
</a>
<p className="type-meta text-ink-3">2026.09.01</p>
```

- 색: `bg-paper`, `bg-surface`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-rule`, `bg-accent`, `text-danger` …
- 글자: `type-display`, `type-title`, `type-body`, `type-meta` … (글꼴·크기·행간·굵기 한 번에). 굵기나 글꼴을 따로 바꿔야 하면 `text-body font-medium`처럼 `text-*`를 쓰세요 (`text-*`는 `font-*`에 덮어써져요)
- 모서리: `rounded-badge`(4), `rounded-card`(6), `rounded-control`(12), `rounded-bubble`(18), `rounded-pill`
- 크기: `h-touch`(44), `px-gutter`(20), `h-control`(48), `h-button-lg`(52)
- 간격은 Tailwind 기본(4px 단위)이 청안 간격과 같아요: `p-1`=4 · `p-3`=12 · `p-5`=20 · `p-12`=48
- 청안 색 말고 다른 색을 못 쓰게 하려면 `tailwind.css`의 `--color-*: initial;` 주석을 푸세요

### Tailwind 없이 (CSS)

```css
@import "./design-system/tokens.css";

.notice-title { color: var(--color-ink); }
.screen { padding-inline: var(--size-gutter); background: var(--color-paper); }
```

```html
<h1 class="type-display">나에게 맞는 공지</h1>
```

### JavaScript · TypeScript · React Native

```ts
import { color, text, space, radius } from "./design-system/tokens";

const styles = {
  title: { ...text.title, color: color.ink },
  card: { borderRadius: radius.card, borderColor: color.rule, padding: space[12] },
};
```

숫자는 px(크기)와 ms(시간)예요. 웹에서는 `${value}px`로 바꿔 쓰고, React Native에서는 그대로 써요. `text.*`의 `fontFamily`는 대체 글꼴이 빠진 이름 하나예요. 웹에서는 `font.*`의 글꼴 스택을 쓰세요.

### iOS · Android · Flutter 등 다른 언어

`tokens.json`을 그대로 읽거나, [Style Dictionary](https://styledictionary.com) 같은 변환 도구로 Swift·Kotlin·Dart 파일을 만들면 돼요. `$type`이 `typography`인 토큰은 여러 값을 묶은 것이라, 도구에 따라 따로 풀어 주는 설정이 필요할 수 있어요.

## 규칙

- 색·글꼴·간격은 값(`#1F4A7C`, `16px`)을 직접 쓰지 말고 토큰 이름으로 써요.
- 강조색은 `accent` 하나예요. 위험한 행동(탈퇴·삭제)에만 `danger`를 써요.
- 글자색은 `ink`, `ink-2`, `ink-3`만 써요. `ink-3`(4.7:1)보다 연한 글자색은 만들지 않아요.
- 누를 수 있는 것은 최소 `size.touch`(44px)예요.
- 그라데이션, 그림자 카드, 왼쪽 색 테두리 카드, 이모지는 쓰지 않아요. 구분은 `rule` 선과 여백으로만 해요.

## 값을 바꿀 때

1. `tokens.json`만 고쳐요. 나머지 3개 파일은 직접 고치지 않아요.
2. 이 폴더에서 `node build-tokens.mjs`를 실행해요.

## 아직 없는 것

- 다크 모드
- 컴포넌트 코드 (근거 공지 카드, 공지 행 등): 프론트엔드 프레임워크가 정해지면 만들어요
- 본문 글꼴 확정: IBM Plex Sans KR로 할지 Pretendard로 할지는 기능 정의서의 "확정이 필요한 항목" 5번이에요

## 함께 보는 자료

- 화면별 기능·상태: [청안 화면 기능 정의서 v0](https://claude.ai/code/artifact/a23733bd-2f86-4c3d-bd7f-38186f61b312) (`../docs/`에 PDF·Word 사본)
- 화면 시안: [청안 프로토타입 캔버스](https://claude.ai/artifact/Htydpo1eqtBGHqLwoRoPdT) (`../docs/청안 프로토타입 v0.pdf`)
