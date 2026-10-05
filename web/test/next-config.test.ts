import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

// anyang-backend-api 10-1절(확인 항목 63) — 보안 헤더 3종만, 전체 경로, CSP 없음.
describe("next.config headers", () => {
  it("applies exactly the three security headers to /:path*", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    expect(rules[0].headers).toEqual([
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]);
  });
});
