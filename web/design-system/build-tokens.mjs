// tokens.json → tokens.css, tailwind.css, tokens.ts
// 실행: node build-tokens.mjs   (Node 18 이상, 설치할 패키지 없음)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(readFileSync(join(here, "tokens.json"), "utf8"));

const HEADER = "자동 생성 파일이에요. 직접 고치지 말고 tokens.json을 고친 뒤 `node build-tokens.mjs`를 실행하세요.";

// --- 토큰 모으기 -----------------------------------------------------------

const tokens = new Map(); // "color.paper" → { path, type, value, description }

function walk(node, path, inheritedType) {
  const type = node.$type ?? inheritedType;
  if ("$value" in node) {
    tokens.set(path.join("."), { path, type, value: node.$value, description: node.$description });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith("$")) walk(child, [...path, key], type);
  }
}
walk(source, [], undefined);

function resolve(value) {
  if (typeof value === "string" && /^\{.+\}$/.test(value)) {
    const target = tokens.get(value.slice(1, -1));
    if (!target) throw new Error(`없는 토큰을 참조해요: ${value}`);
    return resolve(target.value);
  }
  return value;
}

function group(name) {
  return [...tokens.values()].filter((t) => t.path[0] === name).map((t) => ({ ...t, key: t.path.slice(1).join("-") }));
}

const fontStack = (list) => list.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ");
const px = (v) => Number(String(v).replace("px", ""));
const ms = (v) => Number(String(v).replace("ms", ""));
const bezier = (v) => `cubic-bezier(${v.join(", ")})`;

const colors = group("color");
const fonts = group("font");
const texts = group("text").map((t) => ({ ...t, value: { ...t.value, fontFamily: resolve(t.value.fontFamily) } }));
const spaces = group("space");
const sizes = group("size");
const radii = group("radius");
const borders = group("border");
const motion = group("motion");

const comment = (t) => (t.description ? ` /* ${t.description} */` : "");

// CSS 변수 이름은 tokens.css와 tailwind.css가 같아요 (Tailwind v4 이름 규칙).
const fontFamilyVar = (stack) => `var(--font-${fonts.find((f) => f.value === stack).key})`;

function textVars(indent) {
  return texts
    .flatMap((t) => [
      `${indent}--text-${t.key}: ${t.value.fontSize};${comment(t)}`,
      `${indent}--text-${t.key}--line-height: ${t.value.lineHeight};`,
      `${indent}--text-${t.key}--font-weight: ${t.value.fontWeight};`,
      `${indent}--text-${t.key}--letter-spacing: ${t.value.letterSpacing};`,
    ])
    .join("\n");
}

function typeRule(t) {
  return [
    `  font-family: ${fontFamilyVar(t.value.fontFamily)};`,
    `  font-size: var(--text-${t.key});`,
    `  line-height: var(--text-${t.key}--line-height);`,
    `  font-weight: var(--text-${t.key}--font-weight);`,
    `  letter-spacing: var(--text-${t.key}--letter-spacing);`,
  ].join("\n");
}

const colorVars = (i) => colors.map((t) => `${i}--color-${t.key}: ${t.value};${comment(t)}`).join("\n");
const fontVars = (i) => fonts.map((t) => `${i}--font-${t.key}: ${fontStack(t.value)};${comment(t)}`).join("\n");
const radiusVars = (i) => radii.map((t) => `${i}--radius-${t.key}: ${t.value};${comment(t)}`).join("\n");
const spaceVars = (i) => spaces.map((t) => `${i}--space-${t.key}: ${t.value};`).join("\n");
const sizeVars = (i, prefix) => sizes.map((t) => `${i}--${prefix}-${t.key}: ${t.value};${comment(t)}`).join("\n");
const borderVars = (i) => borders.map((t) => `${i}--border-${t.key}: ${t.value};${comment(t)}`).join("\n");
const motionVars = (i) =>
  motion
    .map((t) => `${i}--${t.key}: ${t.type === "cubicBezier" ? bezier(t.value) : t.value};${comment(t)}`)
    .join("\n");

// --- tokens.css: 어떤 웹 프레임워크든 ------------------------------------

const css = `/* ${HEADER} */
/* 글꼴 불러오기는 README.md 참고 */

:root {
${colorVars("  ")}

${fontVars("  ")}

${textVars("  ")}

${spaceVars("  ")}

${sizeVars("  ", "size")}

${radiusVars("  ")}

${borderVars("  ")}

${motionVars("  ")}
}

/* 글자 스타일: class="type-body" 처럼 써요 */
${texts.map((t) => `.type-${t.key} {\n${typeRule(t)}\n}`).join("\n\n")}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-base: 0ms;
  }
}
`;

// --- tailwind.css: Tailwind CSS v4 ----------------------------------------

const tailwind = `/* ${HEADER} */
/* Tailwind CSS v4용. globals.css에서 @import "tailwindcss"; 다음 줄에 이 파일을 import 하세요. */

@theme {
  /* 기본 색 팔레트를 끄고 청안 색만 쓰게 하려면 아래 줄의 주석을 푸세요 */
  /* --color-*: initial; */
${colorVars("  ")}

${fontVars("  ")}

${textVars("  ")}

${radiusVars("  ")}

  /* 간격은 Tailwind 기본(4px 단위)이 청안 간격과 같아요: p-1=4, p-2=8, p-3=12, p-4=16, p-5=20, p-6=24, p-8=32, p-12=48 */
${sizeVars("  ", "spacing")}

  --ease-out: ${bezier(motion.find((t) => t.key === "ease-out").value)};
}

:root {
${spaceVars("  ")}
${borderVars("  ")}
${motionVars("  ").split("\n").filter((l) => !l.includes("--ease-out")).join("\n")}
}

${texts.map((t) => `@utility type-${t.key} {\n${typeRule(t)}\n}`).join("\n\n")}
`;

// --- tokens.ts: JavaScript · TypeScript · React Native ---------------------

const tsKey = (k) => (/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
const obj = (entries, indent = "  ") => `{\n${entries.map(([k, v]) => `${indent}${tsKey(k)}: ${v},`).join("\n")}\n${indent.slice(2)}}`;

const ts = `// ${HEADER}
// 숫자는 px(크기)·ms(시간)예요. 웹에서는 \`\${value}px\`로, React Native에서는 그대로 써요.

/** 색 */
export const color = ${obj(colors.map((t) => [t.key, JSON.stringify(t.value)]))} as const;

/** 글꼴 스택 (웹 CSS용) */
export const font = ${obj(fonts.map((t) => [t.key, JSON.stringify(fontStack(t.value))]))} as const;

/** 글꼴 이름 (React Native처럼 스택을 못 쓰는 곳용) */
export const fontName = ${obj(fonts.map((t) => [t.key, JSON.stringify(t.value[0])]))} as const;

/** 글자 스타일 */
export const text = ${obj(
  texts.map((t) => {
    const famKey = fonts.find((f) => f.value === t.value.fontFamily).key;
    return [
      t.key,
      `{ fontFamily: fontName.${famKey}, fontSize: ${px(t.value.fontSize)}, lineHeight: ${px(t.value.lineHeight)}, fontWeight: ${t.value.fontWeight}, letterSpacing: ${JSON.stringify(t.value.letterSpacing)} }`,
    ];
  }),
)} as const;

/** 간격 (px) */
export const space = ${obj(spaces.map((t) => [t.key, px(t.value)]))} as const;

/** 크기 (px) */
export const size = ${obj(sizes.map((t) => [t.key, px(t.value)]))} as const;

/** 모서리 (px) */
export const radius = ${obj(radii.map((t) => [t.key, px(t.value)]))} as const;

/** 선 두께 (px) */
export const border = ${obj(borders.map((t) => [t.key, px(t.value)]))} as const;

/** 움직임 (ms, cubic-bezier 값) */
export const motion = ${obj(motion.map((t) => [t.key, t.type === "cubicBezier" ? JSON.stringify(t.value) : ms(t.value)]))} as const;

export const tokens = { color, font, fontName, text, space, size, radius, border, motion } as const;
export type ColorToken = keyof typeof color;
export type TextToken = keyof typeof text;
export default tokens;
`;

writeFileSync(join(here, "tokens.css"), css);
writeFileSync(join(here, "tailwind.css"), tailwind);
writeFileSync(join(here, "tokens.ts"), ts);
console.log(`tokens.css, tailwind.css, tokens.ts 생성 (토큰 ${tokens.size}개)`);
