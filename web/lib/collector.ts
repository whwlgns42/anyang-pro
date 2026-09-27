import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { pool } from "./db";
import { parseRobotsTxt, isPathDisallowed } from "./robots";

// anyang-backend-api 5절 — 공지 수집기. 대상 게시판 URL은 확정, robots.txt 준수와 요청 간격은
// 코드에 포함. HTML 구조는 2026-09-28 메인 세션 확인 기준(목록 selectBbsNttList.do?bbsNo=1184&key=3543,
// 상세 selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=...). 상세 페이지에는 게시일이 없어 목록의
// <time> 값을 그대로 쓴다.
const BOARD_ORIGIN = "https://www.anyang.go.kr";
const BOARD_PATH = "/youth/selectBbsNttList.do";
const BBS_NO = "1184";
const BBS_KEY = "3543";
const BOARD_URL = `${BOARD_ORIGIN}${BOARD_PATH}?bbsNo=${BBS_NO}&key=${BBS_KEY}`;
const DEFAULT_REQUEST_DELAY_MS = 2000;
// 연락 가능한 식별 문자열(설계 제안) — 실제 문의 이메일은 배포 시 채운다.
const USER_AGENT = "anyang-youth-policy-bot/1.0 (+contact: TODO-문의이메일)";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// nttNo로 상세 URL을 정규화한다 — 목록 href에 붙는 부가 파라미터와 무관하게
// 같은 글이면 항상 같은 source_url이 되어야 content_hash/source_url 고유성 규칙이 맞는다.
function detailUrlFor(nttNo: string): string {
  return `${BOARD_ORIGIN}/youth/selectBbsNttView.do?key=${BBS_KEY}&bbsNo=${BBS_NO}&nttNo=${nttNo}`;
}

export type ListItem = { url: string; title: string; publishedAt: string | null };
export type DetailContent = { title: string; body: string };

export function parseListPage(html: string): ListItem[] {
  const $ = cheerio.load(html);
  const items: ListItem[] = [];
  $("table.p-table tbody tr").each((_, el) => {
    const row = $(el);
    const link = row.find("td.p-subject a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;
    const nttNo = new URL(href, BOARD_URL).searchParams.get("nttNo");
    if (!nttNo) return;
    const publishedRaw = row.find("td").last().find("time").first().text().trim();
    items.push({ url: detailUrlFor(nttNo), title, publishedAt: publishedRaw || null });
  });
  return items;
}

export function parseDetailPage(html: string): DetailContent {
  const $ = cheerio.load(html);
  const title = $("span.p-table__subject_text").first().text().trim();
  const body = $("td.p-table__content").first().text().trim();
  return { title, body };
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

      const existingBySourceUrl = await pool.query<{ id: string }>(
        `select id from notices where source_url = $1`,
        [item.url],
      );

      await pool.query(
        `insert into notices (source_url, title, body, content_hash, published_at)
         values ($1, $2, $3, $4, $5)
         on conflict (source_url) do update
           set title = excluded.title, body = excluded.body, content_hash = excluded.content_hash,
               published_at = excluded.published_at, collected_at = now()`,
        [item.url, title, detail.body, hash, item.publishedAt],
      );

      if (existingBySourceUrl.rows.length > 0) {
        // 5절 흐름 5 — 변경된 공지는 재임베딩 큐에 다시 올라야 한다. notice_chunks.embedding은
        // NOT NULL이라 null로 되돌릴 수 없으므로, 기존 청크를 지워 embed-job의 "청크 없는
        // 공지" 대기열에 다시 걸리게 한다.
        await pool.query(`delete from notice_chunks where notice_id = $1`, [existingBySourceUrl.rows[0].id]);
      }
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
