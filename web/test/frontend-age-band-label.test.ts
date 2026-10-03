import { describe, expect, it } from "vitest";
import { ageBandDisplay } from "../app/_lib/age-band-label";

const now = new Date("2026-10-03T00:00:00Z");

describe("ageBandDisplay", () => {
  it.each([
    [2010, "19세 미만"],
    [2007, "19~24세"],
    [2002, "19~24세"],
    [2001, "25~29세"],
    [1997, "25~29세"],
    [1996, "30~34세"],
    [1991, "35~39세"],
    [1987, "35~39세"],
    [1986, "40세 이상"],
    [1985, "40세 이상"],
  ])("birth %i -> %s", (year, label) => {
    expect(ageBandDisplay(year, now)).toBe(label);
  });

  it("returns null without birth year", () => {
    expect(ageBandDisplay(null, now)).toBeNull();
    expect(ageBandDisplay(undefined, now)).toBeNull();
  });
});
