import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NoticeRow } from "../app/_components/ui/notice-row";

const base = { id: "1", title: "제목", excerpt: "발췌", postedAt: "2026-10-01" };
const row = (extra = {}) => renderToStaticMarkup(createElement(NoticeRow, { ...base, ...extra }));

describe("NoticeRow", () => {
  it("pinned: star hidden from readers, sr-only prefix, semibold", () => {
    const h = row({ isPinned: true });
    expect(h).toContain("고정 공지, ");
    expect(h).toContain('aria-hidden="true"');
    expect(h).toContain("font-semibold");
  });
  it("not pinned or missing field: no star, no prefix, medium", () => {
    for (const h of [row(), row({ isPinned: false })]) {
      expect(h).not.toContain("고정 공지");
      expect(h).not.toContain("<svg");
      expect(h).toContain("font-medium");
    }
  });
  it("chip only when image_count > 0", () => {
    expect(row({ imageCount: 2 })).toContain("본문 이미지");
    expect(row({ imageCount: 0 })).not.toContain("본문 이미지");
    expect(row()).not.toContain("본문 이미지");
  });
});
