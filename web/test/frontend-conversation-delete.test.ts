import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { insertBack, focusIndexAfterRemove } from "../app/_lib/restore-item";
import { deleteConversation } from "../app/_lib/delete-conversation";
import { snapshotKey, type SnapshotStorage } from "../app/_lib/chat-snapshot";
import { ConversationRow } from "../app/(tabs)/conversations/conversation-row";

const it_ = (id: string) => ({ id });

describe("insertBack", () => {
  it("middle, past end, duplicate, empty", () => {
    const list = [it_("a"), it_("c")];
    expect(insertBack(list, { item: it_("b"), index: 1 }).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(insertBack(list, { item: it_("z"), index: 9 }).map((x) => x.id)).toEqual(["a", "c", "z"]);
    expect(insertBack(list, { item: it_("a"), index: 0 })).toBe(list);
    expect(insertBack([], { item: it_("a"), index: 0 })).toEqual([it_("a")]);
  });
});

describe("focusIndexAfterRemove", () => {
  it("same slot, last row, empty", () => {
    expect(focusIndexAfterRemove(3, 1)).toBe(1);
    expect(focusIndexAfterRemove(2, 2)).toBe(1);
    expect(focusIndexAfterRemove(0, 0)).toBe(-1);
  });
});

function fakeStorage(keys: string[]): SnapshotStorage & { data: Map<string, string> } {
  const data = new Map(keys.map((k) => [k, "x"]));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}
const res = (status: number) => ({ status }) as Response;

describe("deleteConversation", () => {
  const mine = snapshotKey("u1", "c1");
  const others = [snapshotKey("u1", "c2"), snapshotKey("u2", "c1")];

  it("204: DELETE with keepalive passed, only that snapshot removed", async () => {
    const storage = fakeStorage([mine, ...others]);
    const fetcher = vi.fn().mockResolvedValue(res(204));
    await deleteConversation("c1", "u1", { fetcher, storage, keepalive: true });
    expect(fetcher).toHaveBeenCalledWith("/api/conversations/c1", { method: "DELETE", keepalive: true });
    expect([...storage.data.keys()]).toEqual(others);
  });
  it("non-204 or throw: rejects and keeps snapshot", async () => {
    for (const fetcher of [vi.fn().mockResolvedValue(res(500)), vi.fn().mockResolvedValue(res(401)), vi.fn().mockRejectedValue(new Error("net"))]) {
      const storage = fakeStorage([mine]);
      await expect(deleteConversation("c1", "u1", { fetcher, storage })).rejects.toThrow();
      expect(storage.data.has(mine)).toBe(true);
    }
  });
  it("null userId: still calls, skips cleanup", async () => {
    const storage = fakeStorage([mine]);
    const fetcher = vi.fn().mockResolvedValue(res(204));
    await deleteConversation("c1", null, { fetcher, storage });
    expect(fetcher).toHaveBeenCalled();
    expect(storage.data.has(mine)).toBe(true);
  });
});

describe("ConversationRow", () => {
  const html = (title: string | null) =>
    renderToStaticMarkup(createElement(ConversationRow, { id: "c1", title, date: "2026-10-01", onDelete: () => {} }));

  it("link and delete button are siblings, button not inside link", () => {
    const h = html("취업 지원금 문의");
    expect(h).toContain('href="/chat?conversation_id=c1"');
    expect(h).toContain('aria-label="삭제: 취업 지원금 문의"');
    expect(h.match(/<a /g)).toHaveLength(1);
    expect(h.match(/<button /g)).toHaveLength(1);
    expect(h.indexOf("</a>")).toBeLessThan(h.indexOf("<button "));
  });
  it("no title and long title", () => {
    expect(html(null)).toContain('aria-label="삭제: 제목 없는 대화"');
    const long = "가나다라마바사아자차카타파하";
    const h = html(long);
    expect(h).toContain('aria-label="삭제: 가나다라마바사아자차카타…"');
    expect(h).toContain(`>${long}</span>`);
  });
});
