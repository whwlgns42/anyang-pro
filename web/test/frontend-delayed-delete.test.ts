import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDelayedDelete } from "../app/_lib/delayed-delete";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(sendImpl?: () => Promise<void>) {
  const send = vi.fn(sendImpl ?? (() => Promise.resolve()));
  const onFail = vi.fn();
  return { send, onFail, dd: createDelayedDelete<string>({ send, onFail }) };
}

describe("createDelayedDelete", () => {
  it("does not send when undone within 5 seconds", () => {
    const { send, dd } = setup();
    dd.schedule("a");
    vi.advanceTimersByTime(4999);
    expect(dd.undo()).toBe("a");
    vi.advanceTimersByTime(10000);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends after 5 seconds", () => {
    const { send, dd } = setup();
    dd.schedule("a");
    vi.advanceTimersByTime(4999);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledWith("a", false);
    expect(dd.undo()).toBeNull();
  });

  it("flush(true) sends immediately with keepalive, once", () => {
    const { send, dd } = setup();
    dd.schedule("a");
    dd.flush(true);
    expect(send).toHaveBeenCalledWith("a", true);
    vi.advanceTimersByTime(10000);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("scheduling another item sends the previous one immediately", () => {
    const { send, dd } = setup();
    dd.schedule("a");
    dd.schedule("b");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("a", false);
    expect(dd.undo()).toBe("b");
  });

  it("calls onFail with the item when the request fails", async () => {
    const { onFail, dd } = setup(() => Promise.reject(new Error("x")));
    dd.schedule("a");
    await vi.advanceTimersByTimeAsync(5000);
    expect(onFail).toHaveBeenCalledWith("a");
  });
});
