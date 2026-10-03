import { describe, expect, it } from "vitest";
import { needsHomeScreenInstall } from "../app/_lib/install-state";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

describe("needsHomeScreenInstall", () => {
  it("iPhone browser tab needs install", () => {
    expect(needsHomeScreenInstall({ userAgent: IPHONE, maxTouchPoints: 5, standalone: false })).toBe(true);
  });
  it("iPhone home screen app does not", () => {
    expect(needsHomeScreenInstall({ userAgent: IPHONE, maxTouchPoints: 5, standalone: true })).toBe(false);
  });
  it("desktop does not", () => {
    expect(needsHomeScreenInstall({ userAgent: WINDOWS, maxTouchPoints: 0, standalone: false })).toBe(false);
    expect(needsHomeScreenInstall({ userAgent: MAC, maxTouchPoints: 0, standalone: false })).toBe(false);
  });
  it("iPadOS posing as Mac is detected by touch points", () => {
    expect(needsHomeScreenInstall({ userAgent: MAC, maxTouchPoints: 5, standalone: false })).toBe(true);
    expect(needsHomeScreenInstall({ userAgent: MAC, maxTouchPoints: 5, standalone: true })).toBe(false);
  });
});
