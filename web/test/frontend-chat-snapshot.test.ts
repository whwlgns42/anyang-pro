import { describe, expect, it } from "vitest";
import {
  PREFIX,
  clearAllChatSnapshots,
  mergeStreamingSnapshot,
  onLoadFailure,
  shouldCancelRestore,
  removeSnapshot,
  scrollTarget,
  readSnapshot,
  snapshotKey,
  writeSnapshot,
  type SnapshotMessage,
  type SnapshotStorage,
} from "@/app/_lib/chat-snapshot";

function fakeStorage(opts: { failSet?: (n: number) => boolean; broken?: boolean } = {}) {
  const map = new Map<string, string>();
  let sets = 0;
  const s: SnapshotStorage = {
    get length() {
      if (opts.broken) throw new Error("denied");
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => {
      if (opts.broken) throw new Error("denied");
      return map.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (opts.broken || opts.failSet?.(++sets)) throw new Error("quota");
      map.set(k, v);
    },
    removeItem: (k) => {
      if (opts.broken) throw new Error("denied");
      map.delete(k);
    },
  };
  return { s, map };
}

const cit = { id: "1", title: "t", source_url: "u", posted_at: null };
const msgs: SnapshotMessage[] = [
  { role: "user", content: "q" },
  { role: "assistant", content: "a", citations: [cit] },
];
const data = (messages = msgs) => ({ messages, scrollTop: 120, atBottom: false, streaming: false });

describe("chat-snapshot", () => {
  it("builds distinct keys per user and conversation", () => {
    expect(snapshotKey("u1", "c1")).toBe("anyang:chat:v1:u1:c1");
    expect(snapshotKey("u2", "c1")).not.toBe(snapshotKey("u1", "c1"));
    expect(snapshotKey("u1", "c2")).not.toBe(snapshotKey("u1", "c1"));
  });

  it("round-trips messages with citations, scroll and flags", () => {
    const { s } = fakeStorage();
    writeSnapshot(s, "u1", "c1", { ...data(), streaming: true }, 5);
    const snap = readSnapshot(s, "u1", "c1");
    expect(snap).toEqual({ v: 1, savedAt: 5, messages: msgs, scrollTop: 120, atBottom: false, streaming: true });
    expect(readSnapshot(s, "u2", "c1")).toBeNull();
  });

  it("returns null and removes the key for broken or mis-shaped data", () => {
    const bad = [
      "{not json",
      JSON.stringify({ v: 2, savedAt: 1, messages: [], scrollTop: 0, atBottom: true, streaming: false }),
      JSON.stringify({ v: 1, savedAt: 1, messages: "x", scrollTop: 0, atBottom: true, streaming: false }),
      JSON.stringify({ v: 1, savedAt: 1, messages: [{ role: "bot", content: "x" }], scrollTop: 0, atBottom: true, streaming: false }),
      JSON.stringify({ v: 1, savedAt: 1, messages: [{ role: "user", content: 3 }], scrollTop: 0, atBottom: true, streaming: false }),
    ];
    for (const raw of bad) {
      const { s, map } = fakeStorage();
      map.set(snapshotKey("u1", "c1"), raw);
      expect(readSnapshot(s, "u1", "c1")).toBeNull();
      expect(map.size).toBe(0);
    }
  });

  it("drops oldest messages over the char limit and never starts with an assistant", () => {
    const { s } = fakeStorage();
    const big = "x".repeat(90_000);
    const many: SnapshotMessage[] = [
      { role: "user", content: big },
      { role: "assistant", content: big },
      { role: "user", content: big },
      { role: "assistant", content: "last" },
    ];
    writeSnapshot(s, "u1", "c1", data(many));
    const out = readSnapshot(s, "u1", "c1")!.messages;
    expect(out.map((m) => m.content)).toEqual([big, "last"]);
    expect(out[0].role).toBe("user");
  });

  it("keeps at most 10 conversations, evicting the oldest savedAt", () => {
    const { s, map } = fakeStorage();
    for (let i = 1; i <= 11; i++) writeSnapshot(s, "u1", `c${i}`, data(), i);
    expect(map.size).toBe(10);
    expect(map.has(snapshotKey("u1", "c1"))).toBe(false);
    expect(map.has(snapshotKey("u1", "c11"))).toBe(true);
  });

  it("on setItem failure evicts the oldest once and retries; gives up silently otherwise", () => {
    const { s, map } = fakeStorage({ failSet: (n) => n === 3 });
    writeSnapshot(s, "u1", "c1", data(), 1);
    writeSnapshot(s, "u1", "c2", data(), 2);
    writeSnapshot(s, "u1", "c3", data(), 3); // 3번째 setItem 실패 → c1 삭제 후 재시도 성공
    expect([...map.keys()].sort()).toEqual([snapshotKey("u1", "c2"), snapshotKey("u1", "c3")]);

    const always = fakeStorage({ failSet: () => true });
    expect(() => writeSnapshot(always.s, "u1", "c1", data())).not.toThrow();
    const broken = fakeStorage({ broken: true });
    expect(() => writeSnapshot(broken.s, "u1", "c1", data())).not.toThrow();
    expect(readSnapshot(broken.s, "u1", "c1")).toBeNull();
    expect(() => clearAllChatSnapshots(broken.s)).not.toThrow();
    expect(() => writeSnapshot(null, "u1", "c1", data())).not.toThrow();
  });

  it("does not store an empty conversation", () => {
    const { s, map } = fakeStorage();
    writeSnapshot(s, "u1", "c1", data([]));
    expect(map.size).toBe(0);
  });

  it("clearAllChatSnapshots removes only prefixed keys", () => {
    const { s, map } = fakeStorage();
    writeSnapshot(s, "u1", "c1", data());
    writeSnapshot(s, "u2", "c9", data());
    map.set("other:key", "1");
    clearAllChatSnapshots(s);
    expect([...map.keys()]).toEqual(["other:key"]);
    expect(PREFIX).toBe("anyang:chat:v1:");
  });

  it("mergeStreamingSnapshot: server >= snapshot carries citations over; fewer keeps snapshot and flags", () => {
    const snap: SnapshotMessage[] = [
      { role: "user", content: "q" },
      { role: "assistant", content: "par", citations: [cit] },
    ];
    const full = mergeStreamingSnapshot(snap, [
      { role: "user", content: "q" },
      { role: "assistant", content: "partial saved" },
    ]);
    expect(full.interrupted).toBe(false);
    expect(full.streaming).toBe(false);
    expect(full.messages[1]).toEqual({ role: "assistant", content: "partial saved", citations: [cit] });

    const less = mergeStreamingSnapshot(snap, [{ role: "user", content: "q" }]);
    expect(less).toEqual({ messages: snap, interrupted: true, streaming: true });
  });

  it("shouldCancelRestore: cancels only when not ready and the real URL has no conversation_id", () => {
    expect(shouldCancelRestore(false, "")).toBe(true);
    expect(shouldCancelRestore(false, "?x=1")).toBe(true);
    expect(shouldCancelRestore(false, "?conversation_id=abc")).toBe(false); // StrictMode 두 번째 실행
    expect(shouldCancelRestore(true, "")).toBe(false);
  });

  it("onLoadFailure: 404 deletes the snapshot, other errors and network exceptions show it", () => {
    expect(onLoadFailure(404)).toBe("delete");
    for (const st of [500, 401, 403, null]) expect(onLoadFailure(st)).toBe("show");
    const { s, map } = fakeStorage();
    writeSnapshot(s, "u1", "c1", data());
    removeSnapshot(s, "u1", "c1");
    expect(map.size).toBe(0);
  });

  it("mergeStreamingSnapshot: trimmed snapshot aligns citations by tail", () => {
    const cit = [{ title: "t" }] as never;
    const snap = [{ role: "assistant" as const, content: "a", citations: cit }];
    const r = mergeStreamingSnapshot(snap, [
      { role: "user", content: "q" },
      { role: "assistant", content: "a2" },
    ]);
    expect(r.messages[0].citations).toBeUndefined();
    expect(r.messages[1].citations).toBe(cit);
  });

  it("scrollTarget: pending is kept while the list is empty, consumed once filled", () => {
    const p = { scrollTop: 120, atBottom: false };
    expect(scrollTarget(p, 0, 900)).toEqual({ top: 900, consumed: false });
    expect(scrollTarget(p, 3, 900)).toEqual({ top: 120, consumed: true });
    expect(scrollTarget({ scrollTop: 5, atBottom: true }, 3, 900)).toEqual({ top: 900, consumed: true });
    expect(scrollTarget(null, 0, 900)).toEqual({ top: 900, consumed: true });
  });
});
