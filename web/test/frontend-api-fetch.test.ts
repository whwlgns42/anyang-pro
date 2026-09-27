import { describe, expect, it } from "vitest";
import { classifyErrorResponse } from "@/app/_lib/api-fetch";

describe("classifyErrorResponse", () => {
  it("routes ACCOUNT_SUSPENDED to /suspended", () => {
    expect(classifyErrorResponse(403, "ACCOUNT_SUSPENDED")).toEqual({
      type: "redirect",
      path: "/suspended",
    });
  });

  it("routes CONSENT_REQUIRED to /consent", () => {
    expect(classifyErrorResponse(403, "CONSENT_REQUIRED")).toEqual({
      type: "redirect",
      path: "/consent",
    });
  });

  it("routes ADMIN_ONLY to /chat", () => {
    expect(classifyErrorResponse(403, "ADMIN_ONLY")).toEqual({ type: "redirect", path: "/chat" });
  });

  it("ignores ADMIN_EMAIL_RESERVED (handled inline by the signup screen)", () => {
    expect(classifyErrorResponse(403, "ADMIN_EMAIL_RESERVED")).toEqual({ type: "none" });
  });

  it("ignores non-403 statuses", () => {
    expect(classifyErrorResponse(404, "ACCOUNT_SUSPENDED")).toEqual({ type: "none" });
  });
});
