// 자동 생성 파일이에요. 직접 고치지 말고 tokens.json을 고친 뒤 `node build-tokens.mjs`를 실행하세요.
// 숫자는 px(크기)·ms(시간)예요. 웹에서는 `${value}px`로, React Native에서는 그대로 써요.

/** 색 */
export const color = {
  paper: "#F5F3ED",
  surface: "#FCFBF8",
  rule: "#DAD5C9",
  field: "#938D80",
  ink: "#17191E",
  "ink-2": "#454A54",
  "ink-3": "#676C76",
  accent: "#1F4A7C",
  "accent-press": "#163A63",
  "on-accent": "#FFFFFF",
  danger: "#A33A2B",
  "switch-off": "#8C8679",
  disabled: "#E4E0D6",
} as const;

/** 글꼴 스택 (웹 CSS용) */
export const font = {
  display: "Hahmlet, AppleMyungjo, serif",
  sans: "\"IBM Plex Sans KR\", \"Apple SD Gothic Neo\", \"Noto Sans KR\", sans-serif",
  mono: "\"IBM Plex Mono\", ui-monospace, monospace",
} as const;

/** 글꼴 이름 (React Native처럼 스택을 못 쓰는 곳용) */
export const fontName = {
  display: "Hahmlet",
  sans: "IBM Plex Sans KR",
  mono: "IBM Plex Mono",
} as const;

/** 글자 스타일 */
export const text = {
  display: { fontFamily: fontName.display, fontSize: 28, lineHeight: 36, fontWeight: 600, letterSpacing: "-0.01em" },
  "display-sm": { fontFamily: fontName.display, fontSize: 24, lineHeight: 34, fontWeight: 600, letterSpacing: "-0.01em" },
  heading: { fontFamily: fontName.display, fontSize: 19, lineHeight: 28, fontWeight: 600, letterSpacing: "0" },
  title: { fontFamily: fontName.sans, fontSize: 16, lineHeight: 24, fontWeight: 600, letterSpacing: "0" },
  body: { fontFamily: fontName.sans, fontSize: 15, lineHeight: 25, fontWeight: 400, letterSpacing: "0" },
  "body-sm": { fontFamily: fontName.sans, fontSize: 14, lineHeight: 21, fontWeight: 400, letterSpacing: "0" },
  label: { fontFamily: fontName.sans, fontSize: 13, lineHeight: 18, fontWeight: 500, letterSpacing: "0" },
  meta: { fontFamily: fontName.mono, fontSize: 12, lineHeight: 16, fontWeight: 400, letterSpacing: "0" },
  tab: { fontFamily: fontName.sans, fontSize: 11, lineHeight: 14, fontWeight: 500, letterSpacing: "0" },
} as const;

/** 간격 (px) */
export const space = {
  "4": 4,
  "8": 8,
  "12": 12,
  "16": 16,
  "20": 20,
  "24": 24,
  "32": 32,
  "48": 48,
} as const;

/** 크기 (px) */
export const size = {
  touch: 44,
  gutter: 20,
  control: 48,
  "button-lg": 52,
} as const;

/** 모서리 (px) */
export const radius = {
  badge: 4,
  card: 6,
  control: 12,
  bubble: 18,
  "bubble-tail": 4,
  pill: 9999,
} as const;

/** 선 두께 (px) */
export const border = {
  hairline: 1,
  strong: 2,
} as const;

/** 움직임 (ms, cubic-bezier 값) */
export const motion = {
  "duration-fast": 150,
  "duration-base": 200,
  "ease-out": [0,0,0.2,1],
} as const;

export const tokens = { color, font, fontName, text, space, size, radius, border, motion } as const;
export type ColorToken = keyof typeof color;
export type TextToken = keyof typeof text;
export default tokens;
