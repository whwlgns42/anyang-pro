import { describe, expect, it } from "vitest";
import { ageBandLabel } from "@/lib/age-band";

// 기준 시각을 고정해 테스트가 날짜에 따라 흔들리지 않게 한다(Asia/Seoul 2026-06-01 가정).
const NOW = new Date("2026-06-01T00:00:00+09:00");

describe("ageBandLabel", () => {
  it("returns null when birth_year is null (omit condition, item 28)", () => {
    expect(ageBandLabel(null, NOW)).toBeNull();
  });

  it("19세 미만", () => {
    expect(ageBandLabel(2026 - 18, NOW)).toBe("19세 미만");
  });

  it("19~24 (하한 경계 19)", () => {
    expect(ageBandLabel(2026 - 19, NOW)).toBe("19~24");
  });

  it("19~24 (상한 24)", () => {
    expect(ageBandLabel(2026 - 24, NOW)).toBe("19~24");
  });

  it("25~29 (하한 경계 25)", () => {
    expect(ageBandLabel(2026 - 25, NOW)).toBe("25~29");
  });

  it("30~34", () => {
    expect(ageBandLabel(2026 - 32, NOW)).toBe("30~34");
  });

  it("35~39", () => {
    expect(ageBandLabel(2026 - 37, NOW)).toBe("35~39");
  });

  it("40세 이상 (하한 경계 40)", () => {
    expect(ageBandLabel(2026 - 40, NOW)).toBe("40세 이상");
  });

  it("40세 이상 (아주 많은 나이도 안정적으로 같은 구간)", () => {
    expect(ageBandLabel(1900, NOW)).toBe("40세 이상");
  });
});
