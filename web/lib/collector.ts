import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { pool } from "./db";
import { parseRobotsTxt, isPathDisallowed } from "./robots";

// anyang-backend-api 5절 — 공지 수집기. 대상 게시판 URL은 확정, robots.txt 준수와 요청 간격은
// 코드에 포함. HTML 셀렉터는 "구현 전 확인" 항목(실제 게시판 구조 미확인) — 아래 셀렉터는
// 설계 문서 기준 placeholder이며, 고정 픽스처로만 테스트했다. 실사이트 구조를 확인한 뒤
// backend가 셀렉터를 맞춰야 실제 수집이 동작한다(사용자 준비/확인 필요, 이 세션에서는 요청하지 않음).
const BOARD_ORIGIN = "https://www.anyang.go.kr";
const BOARD_PATH = "/youth/selectBbsNttList.do";
const BOARD_URL = `${BOARD_ORIGIN}${BOARD_PATH}?bbsNo=1184&key=3543`;
const DEFAULT_REQUEST_DELAY_MS = 2000;
// 연락 가능한 식별 문자열(설계 제안) — 실제 문의 이메일은 배포 시 채운다.
const USER_AGENT = "anyang-youth-policy-bot/1.0 (+contact: TODO-문의이메일)";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ListItem = { url: string; title: string };
export type DetailContent = { title: string; body: string; publishedAt: string | null };

export function parseListPage(html: string): ListItem[] {
  const $ = cheerio.load(html);
  const items: ListItem[] = [];
  $("table.board-list tbody tr").each((_, el) => {
    const link = $(el).find("a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (href && title) {
      items.push({ url: new URL(href, BOARD_ORIGIN).toString(), title });
    }
  });
  return items;
}

export function parseDetailPage(html: string): DetailContent {
  const $ = cheerio.load(html);
  const title = $(".board-view-title").first().text().trim();
  const body = $(".board-view-content").first().text().trim();
  const publishedRaw = $(".board-view-date").first().text().trim();
  return { title, body, publishedAt: publishedRaw || null };
}

export function contentHash(title: string, body: string): string {
  return createHash("sha256").update(`${title}\n${body}`).digest("hex");
}

export type CollectResult =
  | { ok: true; collectedCount: number }
  | { ok: false; reason: "ROBOTS_DISALLOWED" | "COLLECT_FAILED"; errorSummary: string };

export async function runCollectJob(
  triggerType: "scheduled" | "manual",
  triggeredBy: string | null,
): Promise<CollectResult> {
  const { rows: runRows } = await pool.query<{ id: string }>(
    `insert into collect_runs (trigger_type, status, triggered_by) values ($1, 'running', $2) returning id`,
    [triggerType, triggeredBy],
  );
  const runId = runRows[0].id;

  try {
    const robotsRes = await fetch(`${BOARD_ORIGIN}/robots.txt`, { headers: { "user-agent": USER_AGENT } });
    const robotsText = robotsRes.ok ? await robotsRes.text() : "";
    const rules = parseRobotsTxt(robotsText);
    if (isPathDisallowed(rules, BOARD_PATH)) {
      await pool.query(
        `update collect_runs set finished_at = now(), status = 'failed', error_summary = $2 where id = $1`,
        [runId, "robots.txt disallow"],
      );
      return { ok: false, reason: "ROBOTS_DISALLOWED", errorSummary: "robots.txt disallow" };
    }
    const delayMs = rules.crawlDelaySeconds != null ? rules.crawlDelaySeconds * 1000 : DEFAULT_REQUEST_DELAY_MS;

    const listRes = await fetch(BOARD_URL, { headers: { "user-agent": USER_AGENT } });
    const listHtml = await listRes.text();
    const items = parseListPage(listHtml);

    let collectedCount = 0;
    for (const item of items) {
      await sleep(delayMs);
      const detailRes = await fetch(item.url, { headers: { "user-agent": USER_AGENT } });
      const detailHtml = await detailRes.text();
      const detail = parseDetailPage(detailHtml);
      const title = detail.title || item.title;
      const hash = contentHash(title, detail.body);

      const existing = await pool.query(`select id from notices where content_hash = $1`, [hash]);
      if (existing.rows.length > 0) continue;

      await pool.query(
        `insert into notices (source_url, title, body, content_hash, published_at)
         values ($1, $2, $3, $4, $5)
         on conflict (source_url) do update
           set title = excluded.title, body = excluded.body, content_hash = excluded.content_hash,
               published_at = excluded.published_at, collected_at = now()`,
        [item.url, title, detail.body, hash, detail.publishedAt],
      );
      collectedCount++;
    }

    await pool.query(
      `update collect_runs set finished_at = now(), status = 'success', collected_count = $2 where id = $1`,
      [runId, collectedCount],
    );
    return { ok: true, collectedCount };
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message.slice(0, 500) : "unknown error";
    await pool.query(
      `update collect_runs set finished_at = now(), status = 'failed', error_summary = $2 where id = $1`,
      [runId, errorSummary],
    );
    return { ok: false, reason: "COLLECT_FAILED", errorSummary };
  }
}
