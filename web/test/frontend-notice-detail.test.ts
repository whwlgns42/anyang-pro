import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Attachments } from "../app/(tabs)/notices/[id]/attachments";

const html = (a: unknown, hasSource = true) =>
  renderToStaticMarkup(createElement(Attachments, { attachments: a as never, hasSource }));

describe("Attachments", () => {
  it("renders nothing for 0, missing, or non-array", () => {
    expect(html([])).toBe("");
    expect(html(undefined)).toBe("");
    expect(html("x")).toBe("");
  });
  it("lists n names with heading and hint, names are not links", () => {
    const h = html([{ name: "a.hwp" }, { name: "b.pdf" }]);
    expect(h).toContain("첨부 파일 2개");
    expect(h).toContain("a.hwp");
    expect(h).toContain("b.pdf");
    expect(h).toContain("파일은 원문 페이지에서 받을 수 있어요.");
    expect(h).not.toContain("<a ");
  });
  it("no hint without source link", () => {
    expect(html([{ name: "a" }], false)).not.toContain("원문 페이지에서");
  });
});
