import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CHAT_MAX_LENGTH, counterView, describeChatFailure } from "../app/_lib/chat-error";
import { AnswerBlock, Composer } from "../app/_components/ui/chat";

const JSON_T = "application/json";

describe("describeChatFailure", () => {
  it("network and 5xx retry, with or without body or json type", () => {
    expect(describeChatFailure(0, null, null).kind).toBe("retry");
    expect(describeChatFailure(500, "text/html", null).kind).toBe("retry");
    expect(describeChatFailure(502, JSON_T, { error: "EMBEDDING_FAILED" }).kind).toBe("retry");
    expect(describeChatFailure(502, null, null).kind).toBe("retry");
  });
  it("429 limit with fixed message regardless of limit field", () => {
    for (const body of [{ error: "TOO_MANY_ATTEMPTS", limit: "day" }, { error: "TOO_MANY_ATTEMPTS" }, null]) {
      const f = describeChatFailure(429, JSON_T, body);
      expect(f).toEqual({ kind: "limit", message: "잠시 후 다시 시도해 주세요" });
    }
  });
  it("400 splits too-long and rejected", () => {
    expect(describeChatFailure(400, JSON_T, { error: "MESSAGE_TOO_LONG" }).kind).toBe("too-long");
    expect(describeChatFailure(400, JSON_T, { error: "INVALID_REQUEST" }).kind).toBe("rejected");
    expect(describeChatFailure(400, null, null).kind).toBe("rejected");
  });
  it("ignores body unless content-type is json", () => {
    expect(describeChatFailure(400, "text/plain", { error: "MESSAGE_TOO_LONG" }).kind).toBe("rejected");
  });
  it("401 auth with login link, 404 gone", () => {
    expect(describeChatFailure(401, JSON_T, null)).toMatchObject({ kind: "auth", href: "/login" });
    expect(describeChatFailure(404, JSON_T, { error: "NOT_FOUND" }).kind).toBe("gone");
  });
  it("known 403 shows nothing (apiFetch redirects), unknown 403 is rejected", () => {
    expect(describeChatFailure(403, JSON_T, { error: "CONSENT_REQUIRED" }).kind).toBe("none");
    expect(describeChatFailure(403, JSON_T, { error: "ACCOUNT_SUSPENDED" }).kind).toBe("none");
    expect(describeChatFailure(403, JSON_T, { error: "WHAT" }).kind).toBe("rejected");
  });
});

describe("counterView", () => {
  it("hidden below 1,800, shown from 1,800, limit at 2,000", () => {
    expect(counterView(0)).toBeNull();
    expect(counterView(1799)).toBeNull();
    expect(counterView(1800)).toEqual({ text: "1,800 / 2,000", atLimit: false });
    expect(counterView(2000)).toEqual({ text: "2,000 / 2,000", atLimit: true });
  });
});

const composer = (value: string) =>
  renderToStaticMarkup(createElement(Composer, { value, onChange: () => {}, onSubmit: () => {}, busy: false }));

describe("Composer", () => {
  it("has maxLength and no counter for short text", () => {
    const h = composer("안녕");
    expect(h).toContain(`maxLength="${CHAT_MAX_LENGTH}"`);
    expect(h).not.toContain("aria-describedby");
    expect(h).not.toContain("/ 2,000");
  });
  it("shows counter with describedby from 1,800", () => {
    const h = composer("가".repeat(1800));
    expect(h).toContain("1,800 / 2,000");
    expect(h).toContain('aria-describedby="chat-input-count"');
    expect(h).not.toContain("더 입력할 수 없어요");
  });
  it("announces the limit", () => {
    const h = composer("가".repeat(2000));
    expect(h).toContain('role="status"');
    expect(h).toContain("더 입력할 수 없어요");
  });
});

describe("AnswerBlock error", () => {
  const block = (extra = {}) =>
    renderToStaticMarkup(createElement(AnswerBlock, { context: null, sources: [], state: "error", ...extra }));
  it("default and custom text with retry button", () => {
    expect(block()).toContain("답변을 끝까지 받지 못했어요");
    expect(block({ errorText: "답변을 받지 못했어요" })).toContain("답변을 받지 못했어요");
    expect(block()).toContain("다시 시도");
  });
});
