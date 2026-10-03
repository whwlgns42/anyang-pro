import { describe, expect, it } from "vitest";
import { currentTab, hidesTabBar } from "../app/_lib/nav-tabs";

describe("currentTab", () => {
  it.each([
    ["/chat", "chat"],
    ["/conversations", "chat"],
    ["/notices", "notices"],
    ["/notices/12", "notices"],
    ["/settings/notifications", "alerts"],
    ["/settings", "me"],
    ["/settings/account", "me"],
    ["/settings/memory", "me"],
    ["/admin/users", null],
  ])("%s -> %s", (path, tab) => {
    expect(currentTab(path)).toBe(tab);
  });
});

describe("hidesTabBar", () => {
  it("hides only on notice detail", () => {
    expect(hidesTabBar("/notices/12")).toBe(true);
    expect(hidesTabBar("/notices")).toBe(false);
    expect(hidesTabBar("/chat")).toBe(false);
  });
});
