import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadError } from "../app/_components/ui/load-error";

describe("LoadError", () => {
  it("alert text and retry button", () => {
    const h = renderToStaticMarkup(createElement(LoadError, { message: "공지를 불러오지 못했어요.", onRetry: () => {} }));
    expect(h).toContain('role="alert"');
    expect(h).toContain("공지를 불러오지 못했어요.");
    expect(h).toContain("다시 시도");
  });
});
