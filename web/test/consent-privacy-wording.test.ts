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

// 확인 항목 43(user, 2026-09-29): 이름·호칭 기억 고지가 처리방침 "AI 처리" 절에,
// 안내 문구가 "AI가 기억하는 내 정보" 화면에 남아 있어야 한다. 금지 문자열 규칙은 위와 동일하다.
describe("memory notice wording (확인 항목 43)", () => {
  it("privacy-policy mentions name/nickname memory without forbidden strings", () => {
    const src = readFileSync(join(__dirname, "..", "app", "privacy-policy", "page.tsx"), "utf-8");
    expect(src).toContain("이름이나 호칭");
    expect(src).toContain("AI가 기억하는 내 정보");
    for (const word of FORBIDDEN) {
      expect(src.includes(word)).toBe(false);
    }
  });

  it("memory settings page shows the fixed notice", () => {
    const src = readFileSync(
      join(__dirname, "..", "app", "(tabs)", "settings", "memory", "memory-client.tsx"),
      "utf-8",
    );
    expect(src).toContain("이름이나 호칭 같은 사실을 기억해");
  });
});

// 확인 항목 63(user, 2026-10-05): 보관 기간 고지(대화 1년 자동 삭제·기억 유지, 시도·요청 기록 1일).
// 재동의 없음이라 POLICY_VERSION은 그대로다.
describe("retention notice wording (확인 항목 63)", () => {
  const src = readFileSync(join(__dirname, "..", "app", "privacy-policy", "page.tsx"), "utf-8");
  it("states 1-year conversation deletion, memory kept, and 1-day attempt logs", () => {
    expect(src).toContain("마지막으로 대화한 날부터 1년");
    expect(src).toContain("대화 기록 화면에서 직접");
    expect(src).toContain("AI가 기억한 내용");
    expect(src).toContain("채팅 요청 횟수 기록");
    expect(src).toContain("1일간만 보관");
  });
  it("keeps the earlier retention items", () => {
    expect(src).toContain("탈퇴 후에도 증빙 목적으로 1년간");
    expect(src).toContain("90일간 보관");
  });
  it("does not bump POLICY_VERSION", () => {
    expect(readFileSync(join(__dirname, "..", "lib", "consent.ts"), "utf-8")).toContain('POLICY_VERSION = "2026-09-27"');
  });
});
