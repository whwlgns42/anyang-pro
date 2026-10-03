import { describe, expect, it } from "vitest";
import { formatDate, formatKoreanDay, formatNotifyTime, isHttpUrl, splitLinks } from "../app/_lib/format";

describe("formatDate", () => {
  it("formats date and ISO timestamp", () => {
    expect(formatDate("2026-09-01")).toBe("2026.09.01");
    expect(formatDate("2026-09-01T03:00:00.000Z")).toBe("2026.09.01");
  });
  it("returns null for null or garbage", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("어제")).toBeNull();
  });
});

describe("splitLinks", () => {
  it("links only http(s)", () => {
    expect(splitLinks("신청 https://naver.me/x 까지")).toEqual([
      { text: "신청 " },
      { text: "https://naver.me/x", href: "https://naver.me/x" },
      { text: " 까지" },
    ]);
    expect(splitLinks("javascript:alert(1)")).toEqual([{ text: "javascript:alert(1)" }]);
  });
});

describe("isHttpUrl", () => {
  it("accepts http(s) only", () => {
    expect(isHttpUrl("https://a.kr")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
  });
});

describe("formatNotifyTime", () => {
  it("formats 12 hour clock", () => {
    expect(formatNotifyTime("08:00")).toBe("오전 8:00");
    expect(formatNotifyTime("00:30:00")).toBe("오전 12:30");
    expect(formatNotifyTime("12:00")).toBe("오후 12:00");
    expect(formatNotifyTime("18:05")).toBe("오후 6:05");
  });
});

describe("formatKoreanDay", () => {
  it("uses Korea time", () => {
    expect(formatKoreanDay(new Date("2026-09-29T00:00:00Z"))).toBe("9월 29일 화요일");
    expect(formatKoreanDay(new Date("2026-09-28T16:00:00Z"))).toBe("9월 29일 화요일");
  });
});
