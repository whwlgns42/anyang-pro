import { describe, expect, it } from "vitest";
import { describeTestResult } from "@/app/_lib/test-notify";

const kind = (s: number, b: unknown) => describeTestResult(s, b).kind;

describe("describeTestResult", () => {
  it("200 success", () => {
    const r = describeTestResult(200, { success_count: 1, failed_count: 0 });
    expect(r.kind).toBe("success");
    expect(r.message).toContain("1대");
  });
  it("200 partial failure", () => {
    const r = describeTestResult(200, { success_count: 2, failed_count: 1 });
    expect(r.kind).toBe("success");
    expect(r.message).toContain("2대");
    expect(r.message).toContain("1대는 보내지 못했어요");
  });
  it("409 NO_SUBSCRIPTION and 200 {0,0}", () => {
    expect(kind(409, { error: "NO_SUBSCRIPTION" })).toBe("no-subscription");
    expect(kind(200, { success_count: 0, failed_count: 0 })).toBe("no-subscription");
  });
  it("other 409 or no body is failed", () => {
    expect(kind(409, { error: "X" })).toBe("failed");
    expect(kind(409, null)).toBe("failed");
  });
  it("200 {0,2} is failed", () => {
    expect(kind(200, { success_count: 0, failed_count: 2 })).toBe("failed");
  });
  it("429 is retry with or without body", () => {
    expect(kind(429, { error: "TOO_MANY_ATTEMPTS" })).toBe("retry");
    expect(kind(429, null)).toBe("retry");
  });
  it("401, 500, 403 are failed", () => {
    expect(kind(401, null)).toBe("failed");
    expect(kind(500, null)).toBe("failed");
    expect(kind(403, { error: "ACCOUNT_SUSPENDED" })).toBe("failed");
  });
  it("contract violations are failed", () => {
    expect(kind(200, null)).toBe("failed");
    expect(kind(200, { success_count: "1", failed_count: 0 })).toBe("failed");
  });
  it("network error (0, null) is failed", () => {
    expect(kind(0, null)).toBe("failed");
  });
});
