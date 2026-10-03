import { describe, expect, it, vi } from "vitest";
import { mergeFirstPage, shouldRefetch, subscribeRefetch } from "../app/_lib/notices-refetch";

describe("shouldRefetch", () => {
  it("30s gap and in-flight", () => {
    expect(shouldRefetch(null, 1000, 30000)).toBe(true);
    expect(shouldRefetch(1000, 30999, 30000)).toBe(false);
    expect(shouldRefetch(1000, 31000, 30000)).toBe(true);
    expect(shouldRefetch(1000, 99999, 30000, true)).toBe(false);
  });
});

describe("mergeFirstPage", () => {
  it("puts new page first and drops duplicate ids", () => {
    const out = mergeFirstPage([{ id: "a" }, { id: "b" }, { id: "c" }], [{ id: "n" }, { id: "b" }]);
    expect(out.map((x) => x.id)).toEqual(["n", "b", "a", "c"]);
  });
});

describe("subscribeRefetch", () => {
  it("fires on visible and persisted pageshow only, stops after unsubscribe", () => {
    const doc = Object.assign(new EventTarget(), { visibilityState: "hidden" as DocumentVisibilityState });
    const win = new EventTarget();
    const cb = vi.fn();
    const off = subscribeRefetch(doc as never, win as never, cb);
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(cb).toHaveBeenCalledTimes(0);
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(cb).toHaveBeenCalledTimes(1);
    win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
    expect(cb).toHaveBeenCalledTimes(1);
    win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    expect(cb).toHaveBeenCalledTimes(2);
    off();
    doc.dispatchEvent(new Event("visibilitychange"));
    win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
