import { describe, expect, it } from "vitest";
import { maskPii } from "@/lib/mask-pii";

describe("maskPii", () => {
  it("masks phone numbers", () => {
    expect(maskPii("연락처는 010-1234-5678 입니다")).toBe("연락처는 [전화번호] 입니다");
  });

  it("masks emails", () => {
    expect(maskPii("메일은 test.user@example.com 로 보내주세요")).toBe("메일은 [이메일] 로 보내주세요");
  });

  it("masks resident registration numbers", () => {
    expect(maskPii("주민번호 950101-1234567 확인")).toBe("주민번호 [주민등록번호] 확인");
  });

  it("masks landline numbers with area codes", () => {
    expect(maskPii("전화 02-1234-5678 입니다")).toBe("전화 [전화번호] 입니다");
    expect(maskPii("연락처 031-123-4567")).toBe("연락처 [전화번호]");
  });

  it("masks all three forms together and leaves other text intact", () => {
    const input = "제 번호는 01012345678, 이메일 a@b.co.kr, 주민번호 990101-2345678 입니다. 안녕하세요.";
    const result = maskPii(input);
    expect(result).not.toMatch(/01012345678/);
    expect(result).not.toMatch(/a@b\.co\.kr/);
    expect(result).not.toMatch(/990101-2345678/);
    expect(result).toContain("안녕하세요");
  });
});
