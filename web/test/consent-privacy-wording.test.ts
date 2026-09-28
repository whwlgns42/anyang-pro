import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 확인 항목 41(user, 2026-09-28): 동의 화면·처리방침 화면 렌더 텍스트에 국가명·서비스명이
// 남지 않아야 한다. 소스 파일을 문자열로 읽어 검사한다(렌더러 도입 없이, YAGNI).
const FORBIDDEN = ["DeepSeek", "Gemini", "중국", "국외", "미국", "해외"];

const FILES = [
  join(__dirname, "..", "app", "consent", "consent-form.tsx"),
  join(__dirname, "..", "app", "privacy-policy", "page.tsx"),
];

describe("consent/privacy-policy wording (확인 항목 41)", () => {
  it.each(FILES)("%s has no forbidden country/service strings", (file) => {
    const src = readFileSync(file, "utf-8");
    for (const word of FORBIDDEN) {
      expect(src.includes(word)).toBe(false);
    }
  });
});
