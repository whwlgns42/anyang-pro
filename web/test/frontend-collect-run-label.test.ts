import { describe, expect, it } from "vitest";
import { describeRun, isDirectCollectDisabled } from "../app/_lib/collect-run-label";

const run = (o: Partial<Parameters<typeof describeRun>[0]> = {}) =>
  describeRun({ trigger_type: "manual", status: "success", collected_count: 0, error_summary: null, ...o });

describe("describeRun", () => {
  it("trigger/status mapping and raw fallback", () => {
    expect(run().trigger).toBe("수동");
    expect(run({ trigger_type: "scheduled" }).trigger).toBe("자동");
    expect(run({ trigger_type: "x" }).trigger).toBe("x");
    expect(run({ trigger_type: "constructor" }).trigger).toBe("constructor");
    expect(run({ status: "failed" }).status).toBe("실패");
    expect(run({ status: "running" }).status).toBe("실행 중");
    expect(run({ status: "weird" }).status).toBe("weird");
  });
  it("count", () => {
    expect(run({ collected_count: 3 }).count).toBe("새 글·바뀐 글 3건");
    expect(run({ collected_count: 0 }).count).toBe("새 글·바뀐 글 0건");
    expect(run({ collected_count: null }).count).toBe("-");
  });
  it("five codes map and keep raw", () => {
    for (const c of ["ip_blocked", "empty_list", "parse_failed", "fetch_failed", "robots_disallowed"]) {
      const m = run({ error_summary: c }).message!;
      expect(m.text).not.toBe(c);
      expect(m.raw).toBe(c);
      expect(m.tone).toBe("error");
    }
  });
  it("first word wins, full raw kept", () => {
    const m = run({ error_summary: "ip_blocked kind=full" }).message!;
    expect(m.text).toContain("IP 차단");
    expect(m.raw).toBe("ip_blocked kind=full");
  });
  it("rejected/error counts", () => {
    const m = run({ error_summary: "rejected=2, error=1" }).message!;
    expect(m.text).toBe("일부 항목을 저장하지 못했어요 (거부 2건, 일시 오류 1건).");
    expect(m.tone).toBe("hint");
    expect(run({ error_summary: "rejected=x" }).message!.text).toBe("rejected=x");
  });
  it("null, unknown, near-miss", () => {
    expect(run().message).toBeNull();
    expect(run({ error_summary: "ingest_auth" }).message).toMatchObject({ text: "ingest_auth", raw: null });
    expect(run({ error_summary: "ip_blocked_x" }).message!.text).toBe("ip_blocked_x");
    expect(run({ error_summary: "constructor" }).message!.text).toBe("constructor");
  });
});

describe("isDirectCollectDisabled", () => {
  it("only 410 + code", () => {
    expect(isDirectCollectDisabled(410, { error: "DIRECT_COLLECT_DISABLED" })).toBe(true);
    expect(isDirectCollectDisabled(410, { error: "OTHER" })).toBe(false);
    expect(isDirectCollectDisabled(410, null)).toBe(false);
    expect(isDirectCollectDisabled(500, { error: "DIRECT_COLLECT_DISABLED" })).toBe(false);
  });
});
