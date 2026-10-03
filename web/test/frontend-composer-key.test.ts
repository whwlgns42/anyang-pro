import { describe, expect, it } from "vitest";
import { shouldSubmitOnKey } from "../app/_lib/composer-key";

const ev = (key: string, shiftKey = false, isComposing = false, keyCode = 13) => ({
  key,
  shiftKey,
  nativeEvent: { isComposing, keyCode },
});

describe("shouldSubmitOnKey", () => {
  it("sends on plain Enter", () => {
    expect(shouldSubmitOnKey(ev("Enter"))).toBe(true);
  });
  it("does not send on Shift+Enter", () => {
    expect(shouldSubmitOnKey(ev("Enter", true))).toBe(false);
  });
  it("does not send on Enter while composing (isComposing or keyCode 229)", () => {
    expect(shouldSubmitOnKey(ev("Enter", false, true))).toBe(false);
    expect(shouldSubmitOnKey(ev("Enter", false, false, 229))).toBe(false);
  });
  it("ignores other keys", () => {
    expect(shouldSubmitOnKey(ev("a"))).toBe(false);
  });
});
