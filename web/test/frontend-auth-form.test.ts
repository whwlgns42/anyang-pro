import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_HINT_TEXT,
  TOO_MANY_ATTEMPTS_TEXT,
  LOGIN_INVALID_TEXT,
  isPasswordTooShort,
  getRegisterErrorMessage,
  isLoginTooManyAttempts,
} from "@/app/_lib/auth-form";

describe("isPasswordTooShort", () => {
  it("is false for empty input (no premature error before typing)", () => {
    expect(isPasswordTooShort("")).toBe(false);
  });

  it(`is true for 1..${MIN_PASSWORD_LENGTH - 1} chars`, () => {
    expect(isPasswordTooShort("a")).toBe(true);
    expect(isPasswordTooShort("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(true);
  });

  it(`is false at exactly ${MIN_PASSWORD_LENGTH} chars or more`, () => {
    expect(isPasswordTooShort("a".repeat(MIN_PASSWORD_LENGTH))).toBe(false);
    expect(isPasswordTooShort("a".repeat(MIN_PASSWORD_LENGTH + 5))).toBe(false);
  });
});

describe("getRegisterErrorMessage", () => {
  it("maps 409 to duplicate email message", () => {
    expect(getRegisterErrorMessage(409)).toBe("이미 가입된 이메일입니다.");
  });

  it("maps 429 TOO_MANY_ATTEMPTS to the rate-limit message", () => {
    expect(getRegisterErrorMessage(429, "TOO_MANY_ATTEMPTS")).toBe(TOO_MANY_ATTEMPTS_TEXT);
  });

  it("maps 400 PASSWORD_TOO_SHORT to the same hint text", () => {
    expect(getRegisterErrorMessage(400, "PASSWORD_TOO_SHORT")).toBe(PASSWORD_HINT_TEXT);
  });

  it("maps 403 ADMIN_EMAIL_RESERVED to the Google-login guidance", () => {
    expect(getRegisterErrorMessage(403, "ADMIN_EMAIL_RESERVED")).toBe(
      "이 이메일은 비밀번호로 가입할 수 없습니다. Google로 로그인해 주세요.",
    );
  });

  it("maps other 403 to a generic rejection", () => {
    expect(getRegisterErrorMessage(403, "SOMETHING_ELSE")).toBe("가입할 수 없습니다.");
  });

  it("falls back to a generic error for anything else", () => {
    expect(getRegisterErrorMessage(500)).toBe("가입 중 오류가 발생했습니다.");
  });
});

describe("isLoginTooManyAttempts / LOGIN_INVALID_TEXT", () => {
  it("recognizes the TOO_MANY_ATTEMPTS code", () => {
    expect(isLoginTooManyAttempts("TOO_MANY_ATTEMPTS")).toBe(true);
  });

  it("is false for a plain credentials failure", () => {
    expect(isLoginTooManyAttempts("CredentialsSignin")).toBe(false);
    expect(isLoginTooManyAttempts(undefined)).toBe(false);
  });

  it("has a distinct invalid-credentials message from the rate-limit message", () => {
    expect(LOGIN_INVALID_TEXT).not.toBe(TOO_MANY_ATTEMPTS_TEXT);
  });
});
