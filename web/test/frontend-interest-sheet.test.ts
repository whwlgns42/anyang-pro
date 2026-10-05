import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sheetView } from "../app/_lib/interest-sheet";
import { InterestSheetBody } from "../app/(tabs)/notices/interest-sheet";
import { Sheet } from "../app/_components/ui/sheet";
import { MemoryClient } from "../app/(tabs)/settings/memory/memory-client";

const noop = () => {};
const body = (status: "loading" | "ok" | "error", items: { id: string; preference_text: string }[] = []) =>
  renderToStaticMarkup(createElement(InterestSheetBody, { status, items, onRetry: noop }));

describe("sheetView", () => {
  it("maps status and count", () => {
    expect(sheetView("loading", 0)).toBe("loading");
    expect(sheetView("loading", 3)).toBe("loading");
    expect(sheetView("error", 5)).toBe("error");
    expect(sheetView("ok", 0)).toBe("empty");
    expect(sheetView("ok", 1)).toBe("list");
  });
});

describe("InterestSheetBody", () => {
  it("list: li items, manage link, read-only", () => {
    const h = body("ok", [
      { id: "1", preference_text: "청년 월세 지원" },
      { id: "2", preference_text: "취업 교육" },
    ]);
    expect(h.match(/<li/g)).toHaveLength(2);
    expect(h).toContain("청년 월세 지원");
    expect(h).toContain('href="/settings#memory"');
    expect(h).toContain("내 정보에서 관리");
    expect(h).not.toContain("수정:");
    expect(h).not.toContain("삭제:");
  });
  it("empty: notice text, no link, no occupation mention", () => {
    const h = body("ok");
    expect(h).toContain("아직 모인 관심사가 없어요");
    expect(h).not.toContain("href=");
    expect(h).not.toContain("직군");
  });
  it("loading: role=status, no link", () => {
    const h = body("loading");
    expect(h).toContain('role="status"');
    expect(h).not.toContain("href=");
  });
  it("error: role=alert, retry button, no link", () => {
    const h = body("error");
    expect(h).toContain('role="alert"');
    expect(h).toContain("다시 시도");
    expect(h).not.toContain("href=");
  });
});

describe("Sheet", () => {
  it("closed: no open attr, labelledby matches h2 id, aria-modal", () => {
    const h = renderToStaticMarkup(createElement(Sheet, { open: false, title: "제목", onClose: noop, children: "x" }));
    expect(h).not.toMatch(/<dialog[^>]*\sopen/);
    expect(h).toContain('aria-modal="true"');
    const labelled = h.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(labelled).toBeTruthy();
    expect(h).toContain(`<h2 id="${labelled}"`);
  });
});

describe("MemoryClient anchor", () => {
  it('has section id="memory"', () => {
    expect(renderToStaticMarkup(createElement(MemoryClient))).toContain('id="memory"');
  });
});
