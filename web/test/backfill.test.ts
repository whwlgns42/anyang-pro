import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ pool: { end: vi.fn() } }));
vi.mock("@/lib/collector", () => ({ runCollectJob: vi.fn() }));
vi.mock("@/lib/embed-job", () => ({ runEmbedJob: vi.fn() }));

const { parsePagesArg, embedUntilDrained } = await import("../scripts/backfill");

describe("backfill script helpers", () => {
  it("defaults to pages 1-47", () => {
    expect(parsePagesArg([])).toEqual([1, 47]);
  });

  it("parses --pages A-B", () => {
    expect(parsePagesArg(["--pages", "1-2"])).toEqual([1, 2]);
  });

  it("rejects malformed or reversed ranges", () => {
    expect(() => parsePagesArg(["--pages", "x"])).toThrow();
    expect(() => parsePagesArg(["--pages"])).toThrow();
    expect(() => parsePagesArg(["--pages", "5-2"])).toThrow();
    expect(() => parsePagesArg(["--pages", "0-2"])).toThrow();
  });

  it("repeats the embed job until it embeds nothing and sums the chunks", async () => {
    const embed = vi
      .fn()
      .mockResolvedValueOnce({ processed_notices: 15, embedded_chunks: 15 })
      .mockResolvedValueOnce({ processed_notices: 4, embedded_chunks: 5 })
      .mockResolvedValueOnce({ processed_notices: 0, embedded_chunks: 0 });
    expect(await embedUntilDrained(embed)).toBe(20);
    expect(embed).toHaveBeenCalledTimes(3);
  });
});
