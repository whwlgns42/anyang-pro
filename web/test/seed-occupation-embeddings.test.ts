import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ pool: { query: vi.fn(), end: vi.fn() } }));

const { seedOccupationEmbeddings } = await import("@/scripts/seed-occupation-embeddings");
const { OCCUPATION_SENTENCES } = await import("@/lib/occupation-sentences");

// anyang-backend-api 7-2절 테스트 ⑥ — 문장당 embedText 1회, upsert, 재실행해도 행 수 불변.
describe("seedOccupationEmbeddings", () => {
  it("embeds each sentence once and upserts by code; no 'other' row", async () => {
    const embed = vi.fn(async () => ({ embedding: [0.1, 0.2], model: "gemini-embedding-001" }));
    const rows = new Map<string, unknown[]>();
    const query = vi.fn(async (sql: string, params: unknown[]) => {
      expect(sql).toContain("on conflict (code) do update");
      rows.set(params[0] as string, params);
    });

    expect(await seedOccupationEmbeddings(embed, query)).toBe(7);
    expect(embed).toHaveBeenCalledTimes(7);
    await seedOccupationEmbeddings(embed, query);
    expect(rows.size).toBe(7);
    expect(rows.has("other")).toBe(false);
    expect(rows.get("it")?.[1]).toBe(OCCUPATION_SENTENCES.it);
  });
});
