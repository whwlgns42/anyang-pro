import { describe, expect, it } from "vitest";
import { noticesQueryString } from "@/app/admin/_lib/notices-query";

describe("noticesQueryString", () => {
  it("omits the hidden param for 'all'", () => {
    expect(noticesQueryString({ page: 1, hiddenFilter: "all" }, 20)).toBe("page=1&page_size=20");
  });

  it("maps 'visible' to hidden=false", () => {
    expect(noticesQueryString({ page: 2, hiddenFilter: "visible" }, 20)).toBe(
      "page=2&page_size=20&hidden=false",
    );
  });

  it("maps 'hidden' to hidden=true", () => {
    expect(noticesQueryString({ page: 1, hiddenFilter: "hidden" }, 20)).toBe(
      "page=1&page_size=20&hidden=true",
    );
  });
});
