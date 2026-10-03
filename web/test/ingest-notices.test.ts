import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { contentHash } from "@/lib/notice-parser";

// anyang-board-collector F-1 — 받기 API 단위 테스트(목 기반, 실제 DB·사이트 미사용).
type Row = { id: string; content_hash: string };
const store = new Map<string, Row>();
const clientCalls: { sql: string; params?: unknown[] }[] = [];
const poolCalls: { sql: string; params?: unknown[] }[] = [];
let failSaveFor: string | null = null;
let collectRunsFails = false;

const client = {
  query: vi.fn(async (sql: string, params?: unknown[]) => {
    const text = String(sql);
    clientCalls.push({ sql: text, params });
    if (text.includes("for update")) {
      const url = String(params?.[0]);
      if (url === failSaveFor) throw new Error("db down");
      const row = store.get(url);
      return { rows: row ? [row] : [] };
    }
    if (text.includes("insert into notices")) {
      const url = String(params?.[0]);
      store.set(url, { id: store.get(url)?.id ?? `id-${store.size + 1}`, content_hash: String(params?.[3]) });
    }
    return { rows: [] };
  }),
  release: vi.fn(),
};
vi.mock("@/lib/db", () => ({
  pool: {
    connect: async () => client,
    query: async (sql: string, params?: unknown[]) => {
      poolCalls.push({ sql: String(sql), params });
      if (String(sql).includes("insert into collect_runs") && collectRunsFails) throw new Error("x");
      return { rows: [] };
    },
  },
}));
const runEmbedJobMock = vi.fn();
const countUnembeddedMock = vi.fn();
vi.mock("@/lib/embed-job", () => ({
  runEmbedJob: (...a: unknown[]) => runEmbedJobMock(...a),
  countUnembedded: (...a: unknown[]) => countUnembeddedMock(...a),
}));

const { POST } = await import("@/app/api/ingest/notices/route");

const URL_BASE = "https://www.anyang.go.kr/youth/selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=";
function item(n: number, over: Record<string, unknown> = {}) {
  const title = (over.title as string) ?? `공지${n}`;
  const body = (over.body as string) ?? `본문${n}`;
  return {
    source_url: `${URL_BASE}${n}`,
    title,
    body,
    content_hash: contentHash(title, body),
    published_at: "2026-09-01",
    is_pinned: false,
    image_count: 0,
    attachments: [],
    ...over,
  };
}
function req(body: unknown, headers: Record<string, string> = { "x-collector-secret": "cs" }, raw?: string) {
  return new Request("http://localhost/api/ingest/notices", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw ?? JSON.stringify(body),
  });
}
const post = async (items: unknown[], extra: Record<string, unknown> = {}) => {
  const res = await POST(req({ kind: "quick", items, ...extra }));
  return { res, json: (await res.json()) as any };
};
const sql = (needle: string) => [...clientCalls, ...poolCalls].filter((c) => c.sql.includes(needle));

describe("POST /api/ingest/notices", () => {
  const saved = { cs: process.env.COLLECTOR_INGEST_SECRET, sch: process.env.SCHEDULER_SHARED_SECRET, bf: process.env.BACKFILL_SECRET };

  beforeEach(() => {
    store.clear();
    clientCalls.length = 0;
    poolCalls.length = 0;
    failSaveFor = null;
    collectRunsFails = false;
    runEmbedJobMock.mockReset().mockResolvedValue({ processed_notices: 0, embedded_chunks: 0 });
    countUnembeddedMock.mockReset().mockResolvedValue(0);
    process.env.COLLECTOR_INGEST_SECRET = "cs";
    process.env.SCHEDULER_SHARED_SECRET = "sch";
    process.env.BACKFILL_SECRET = "bf";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const [k, v] of [["COLLECTOR_INGEST_SECRET", saved.cs], ["SCHEDULER_SHARED_SECRET", saved.sch], ["BACKFILL_SECRET", saved.bf]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  describe("auth", () => {
    it("401 with empty body when the env var is empty, whatever header is sent", async () => {
      process.env.COLLECTOR_INGEST_SECRET = "";
      const res = await POST(req({ kind: "quick", items: [item(1)] }, { "x-collector-secret": "" }));
      expect(res.status).toBe(401);
      expect(await res.text()).toBe("");
      delete process.env.COLLECTOR_INGEST_SECRET;
      expect((await POST(req({ kind: "quick", items: [item(1)] }))).status).toBe(401);
    });

    it("401 for a wrong key, and for scheduler/backfill keys alone", async () => {
      const body = { kind: "quick", items: [item(1)] };
      expect((await POST(req(body, { "x-collector-secret": "nope" }))).status).toBe(401);
      expect((await POST(req(body, { "x-scheduler-secret": "sch" }))).status).toBe(401);
      expect((await POST(req(body, { "x-backfill-secret": "bf" }))).status).toBe(401);
      expect(sql("insert into notices")).toHaveLength(0);
    });

    it("passes with the right key", async () => {
      expect((await post([item(1)])).res.status).toBe(200);
    });
  });

  describe("request shape", () => {
    it("400 INVALID_BODY: not JSON, 21 items, missing/unknown kind, items not an array, bad report, nothing to do", async () => {
      const bad = async (r: Request) => {
        const res = await POST(r);
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "INVALID_BODY" });
      };
      await bad(req(null, undefined, "not json"));
      await bad(req({ kind: "quick", items: Array.from({ length: 21 }, (_, i) => item(i + 1)) }));
      await bad(req({ items: [item(1)] }));
      await bad(req({ kind: "weekly", items: [item(1)] }));
      await bad(req({ kind: "quick", items: "x" }));
      await bad(req({ kind: "quick", items: [], report: { status: "success", error_code: "ip_blocked" } }));
      await bad(req({ kind: "quick", items: [], report: { status: "failed", error_code: "other" } }));
      await bad(req({ kind: "quick", items: [] }));
      expect(sql("insert into collect_runs")).toHaveLength(0);
    });

    it("413 PAYLOAD_TOO_LARGE above 4MB", async () => {
      const res = await POST(req(null, undefined, "x".repeat(4 * 1024 * 1024 + 1)));
      expect(res.status).toBe(413);
      expect(await res.json()).toEqual({ error: "PAYLOAD_TOO_LARGE" });
    });
  });

  describe("item validation: only that item is rejected, the rest are processed", () => {
    const cases: [string, Record<string, unknown>, string][] = [
      ["other domain", { source_url: "https://evil.example/youth/selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=1" }, "INVALID_URL"],
      ["http", { source_url: `${URL_BASE}1`.replace("https", "http") }, "INVALID_URL"],
      ["extra query", { source_url: `${URL_BASE}1&x=1` }, "INVALID_URL"],
      ["empty title", { title: "  " }, "INVALID_FIELD"],
      ["501-char title", { title: "가".repeat(501) }, "INVALID_FIELD"],
      ["NUL in body", { body: "a\u0000b" }, "INVALID_FIELD"],
      ["body over limit", { body: "a".repeat(200_001) }, "INVALID_FIELD"],
      ["bad hash format", { content_hash: "abc" }, "INVALID_FIELD"],
      ["hash mismatch", { content_hash: "0".repeat(64) }, "HASH_MISMATCH"],
      ["impossible date", { published_at: "2026-02-30" }, "INVALID_FIELD"],
      ["image_count range", { image_count: 1001 }, "INVALID_FIELD"],
      ["image_count non-integer", { image_count: 1.5 }, "INVALID_FIELD"],
      ["is_pinned not boolean", { is_pinned: "yes" }, "INVALID_FIELD"],
      ["attachment other domain", { attachments: [{ name: "a", url: "https://evil.example/downloadBbsFile.do?x=1" }] }, "INVALID_FIELD"],
      ["attachment not a download link", { attachments: [{ name: "a", url: "https://www.anyang.go.kr/other.do" }] }, "INVALID_FIELD"],
      [
        "duplicate attachment url",
        {
          attachments: [
            { name: "a", url: "https://www.anyang.go.kr/youth/downloadBbsFile.do?n=1" },
            { name: "b", url: "https://www.anyang.go.kr/youth/downloadBbsFile.do?n=1" },
          ],
        },
        "INVALID_FIELD",
      ],
      ["51 attachments", { attachments: Array.from({ length: 51 }, (_, i) => ({ name: "a", url: `https://www.anyang.go.kr/youth/downloadBbsFile.do?n=${i}` })) }, "INVALID_FIELD"],
    ];
    for (const [name, over, code] of cases) {
      it(`${name} -> rejected ${code}`, async () => {
        const bad = item(1, over);
        const { res, json } = await post([bad, item(2)]);
        expect(res.status).toBe(200);
        expect(json.results.map((r: any) => r.result)).toEqual(["rejected", "created"]);
        expect(json.results[0].code).toBe(code);
        expect(sql("insert into notices")).toHaveLength(1);
        expect(json.collected_count).toBe(1);
      });
    }

    it("accepts a null date, empty body, and valid attachments", async () => {
      const ok = item(1, { published_at: null, body: "", attachments: [{ name: "a.pdf", url: "https://www.anyang.go.kr/youth/downloadBbsFile.do?n=1" }] });
      expect((await post([ok])).json.results[0].result).toBe("created");
    });
  });

  describe("saving", () => {
    it("created, then unchanged on resend (idempotent, only the 4 metadata columns, chunks untouched)", async () => {
      const first = await post([item(1)]);
      expect(first.json.results).toEqual([{ source_url: `${URL_BASE}1`, result: "created" }]);
      clientCalls.length = 0;
      const again = await post([item(1, { is_pinned: true, image_count: 2 })]);
      expect(again.json.results[0].result).toBe("unchanged");
      expect(again.json.collected_count).toBe(0);
      expect(sql("update notices set is_pinned")).toHaveLength(1);
      expect(sql("insert into notices")).toHaveLength(0);
      expect(sql("delete from notice_chunks")).toHaveLength(0);
      expect(String(sql("update notices set is_pinned")[0].sql)).not.toContain("hidden_at");
    });

    it("updated when the hash differs: upsert + chunk delete inside one transaction", async () => {
      await post([item(1)]);
      clientCalls.length = 0;
      const { json } = await post([item(1, { body: "수정됨" })]);
      expect(json.results[0].result).toBe("updated");
      expect(json.collected_count).toBe(1);
      const order = clientCalls.map((c) => c.sql.trim().split(/\s+/).slice(0, 2).join(" "));
      expect(order[0]).toBe("begin");
      expect(order.at(-1)).toBe("commit");
      expect(sql("delete from notice_chunks")).toHaveLength(1);
      expect(String(sql("insert into notices")[0].sql)).not.toContain("hidden_at");
    });

    it("a DB error on one item gives error/DB_ERROR (rolled back) and does not block the others", async () => {
      failSaveFor = `${URL_BASE}1`;
      const { res, json } = await post([item(1), item(2)]);
      expect(res.status).toBe(200);
      expect(json.results).toEqual([
        { source_url: `${URL_BASE}1`, result: "error", code: "DB_ERROR" },
        { source_url: `${URL_BASE}2`, result: "created" },
      ]);
      expect(sql("rollback")).toHaveLength(1);
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("collect_runs: exactly one row per call", () => {
    it("success call: one row, success, collected_count, no summary", async () => {
      await post([item(1), item(2)]);
      const runs = sql("insert into collect_runs");
      expect(runs).toHaveLength(1);
      expect(runs[0].params![0]).toBe("success");
      expect(runs[0].params![2]).toBe(2);
      expect(runs[0].params![3]).toBeNull();
    });

    it("all rejected: still success with rejected/error counts in the summary", async () => {
      await post([item(1, { title: "" }), item(2, { content_hash: "0".repeat(64) })]);
      const runs = sql("insert into collect_runs");
      expect(runs).toHaveLength(1);
      expect([runs[0].params![0], runs[0].params![2], runs[0].params![3]]).toEqual(["success", 0, "rejected=2, error=0"]);
    });

    it("report call with no items: 200, failed row, summary has the code, embed job never called", async () => {
      const { res, json } = await post([], { kind: "full", report: { status: "failed", error_code: "ip_blocked" } });
      expect(res.status).toBe(200);
      expect(json.results).toEqual([]);
      const runs = sql("insert into collect_runs");
      expect(runs).toHaveLength(1);
      expect(runs[0].params![0]).toBe("failed");
      expect(runs[0].params![3]).toBe("ip_blocked kind=full");
      expect(runEmbedJobMock).not.toHaveBeenCalled();
    });

    it("a collect_runs insert failure does not turn the response into an error", async () => {
      collectRunsFails = true;
      expect((await post([item(1)])).res.status).toBe(200);
    });
  });

  describe("embedding", () => {
    it("stops starting new batches after 200 seconds (fake clock)", async () => {
      let now = 1_000_000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      runEmbedJobMock.mockImplementation(async () => {
        now += 90_000;
        return { processed_notices: 15, embedded_chunks: 15 };
      });
      await post([item(1)]);
      expect(runEmbedJobMock).toHaveBeenCalledTimes(3); // t=0, 90s, 180s 시작 / 270s에서 중단
    });

    it("stops as soon as the queue is empty", async () => {
      runEmbedJobMock
        .mockResolvedValueOnce({ processed_notices: 2, embedded_chunks: 2 })
        .mockResolvedValueOnce({ processed_notices: 0, embedded_chunks: 0 });
      await post([item(1)]);
      expect(runEmbedJobMock).toHaveBeenCalledTimes(2);
    });

    it("embed failure keeps 200; remaining_unembedded is filled, or null when counting fails", async () => {
      runEmbedJobMock.mockRejectedValue(new Error("gemini down"));
      countUnembeddedMock.mockResolvedValue(7);
      expect((await post([item(1)])).json.remaining_unembedded).toBe(7);
      countUnembeddedMock.mockRejectedValue(new Error("db"));
      const { res, json } = await post([item(1)]);
      expect(res.status).toBe(200);
      expect(json.remaining_unembedded).toBeNull();
    });
  });

  it("neither the response nor the logs contain the key or the body text", async () => {
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error")].map((s) => s.mockImplementation(() => {}));
    failSaveFor = `${URL_BASE}2`;
    const { json } = await post([item(1, { body: "비밀본문텍스트" }), item(2)]);
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain("cs\"");
    expect(logged).not.toContain("비밀본문텍스트");
    expect(JSON.stringify(json)).not.toContain("비밀본문텍스트");
  });

  it("500 INGEST_FAILED on an unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = req({ kind: "quick", items: [item(1)] });
    vi.spyOn(r, "text").mockRejectedValue(new Error("boom"));
    const res = await POST(r);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "INGEST_FAILED" });
  });
});
