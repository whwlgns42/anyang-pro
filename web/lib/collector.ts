import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { pool } from "./db";
import { parseRobotsTxt, isPathDisallowed } from "./robots";

// anyang-backend-api 5·5-1절 — 공지 수집기. 대상 게시판 URL은 확정, robots.txt 준수와 요청 간격은
// 코드에 포함. HTML 구조는 2026-09-28 메인 세션 확인 + 2026-10-04 실측 기준(목록 selectBbsNttList.do?bbsNo=1184&key=3543,
// 상세 selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=...). 상세 페이지에는 게시일이 없어 목록의
// <time> 값을 그대로 쓴다.
const BOARD_ORIGIN = "https://www.anyang.go.kr";
const BOARD_PATH = "/youth/selectBbsNttList.do";
const BBS_NO = "1184";
const BBS_KEY = "3543";
const BOARD_URL = `${BOARD_ORIGIN}${BOARD_PATH}?bbsNo=${BBS_NO}&key=${BBS_KEY}`;
const DEFAULT_REQUEST_DELAY_MS = 2000;
// 5-1절 8번 — 문의 연락처는 환경변수 COLLECTOR_CONTACT로 받는다. 없으면 연락처 없이 보낸다.
function userAgent(): string {
  const contact = process.env.COLLECTOR_CONTACT?.trim();
  return contact ? `anyang-youth-policy-bot/1.0 (+contact: ${contact})` : "anyang-youth-policy-bot/1.0";
}
// 5-1절 4번 — 겹침 방지용 트랜잭션 advisory lock 키(임의의 고정 상수).
const COLLECT_LOCK_KEY = 5517042;
const STALE_RUNNING_MINUTES = 10;
const DEFAULT_BACKFILL_LAST_PAGE = 47;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// nttNo로 상세 URL을 정규화한다 — 목록 href에 붙는 부가 파라미터와 무관하게
// 같은 글이면 항상 같은 source_url이 되어야 source_url 고유성 규칙이 맞는다.
function detailUrlFor(nttNo: string): string {
  return `${BOARD_ORIGIN}/youth/selectBbsNttView.do?key=${BBS_KEY}&bbsNo=${BBS_NO}&nttNo=${nttNo}`;
}

export type ListItem = { url: string; title: string; publishedAt: string | null; isPinned: boolean };
export type Attachment = { name: string; url: string };
export type DetailContent = { title: string; body: string; attachments: Attachment[]; imageCount: number };

// 고정 공지 판정(55-b): 이 사이트 CSS(common/css/program.css)에 `.p-table .p-notice` 규칙이 있어 고정 행은
// `<tr class="p-notice">`로 본다. 2026-10-04 실측 1~2페이지에는 고정 행이 없어 실제 고정 행 HTML은
// 확인하지 못했다(CSS 근거 + 합성 픽스처 테스트). 틀리면 isPinned가 항상 false일 뿐 수집에는 영향이 없다.
export function parseListPage(html: string): ListItem[] {
  const $ = cheerio.load(html);
  const items: ListItem[] = [];
  const seen = new Set<string>();
  $("table.p-table tbody tr").each((_, el) => {
    const row = $(el);
    const link = row.find("td.p-subject a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;
    const nttNo = new URL(href, BOARD_URL).searchParams.get("nttNo");
    if (!nttNo) return;
    const url = detailUrlFor(nttNo);
    if (seen.has(url)) return; // 고정 공지가 일반 순서에도 나오면 먼저 나온 것(고정 쪽)만 남긴다.
    seen.add(url);
    const publishedRaw = row.find("td").last().find("time").first().text().trim();
    items.push({ url, title, publishedAt: publishedRaw || null, isPinned: row.hasClass("p-notice") });
  });
  return items;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|tiff?)$/i;

// 이모지 제외: CKEditor 스마일리 이미지(/plugin/ckeditor/plugins/smiley/). 첨부 이미지 중복 제외:
// 사이트가 이미지 첨부를 본문 끝에 `div.p-photo`로 다시 그리므로 그 <img>는 첨부 쪽에서만 센다.
function countBodyImages($: cheerio.CheerioAPI, bodyEl: cheerio.Cheerio<any>): number {
  return bodyEl.find("img").filter((_, img) => {
    const src = $(img).attr("src") ?? "";
    return !src.includes("/plugin/ckeditor/plugins/smiley/") && $(img).closest(".p-photo").length === 0;
  }).length;
}

export function parseDetailPage(html: string): DetailContent {
  const $ = cheerio.load(html);
  const title = $("span.p-table__subject_text").first().text().trim();
  const bodyEl = $("td.p-table__content").first();
  const body = bodyEl.text().trim();

  const attachments: Attachment[] = [];
  const seenUrls = new Set<string>();
  $("ul.p-attach a.p-attach__link").each((_, el) => {
    const link = $(el);
    const href = link.attr("href");
    if (!href || !href.includes("downloadBbsFile.do")) return;
    const url = new URL(href, BOARD_URL).href;
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    // 링크 안에는 확장자 아이콘 span(.p-icon)과 파일명 span이 함께 있다.
    const name = link.children("span").not(".p-icon").text().trim() || link.text().trim();
    attachments.push({ name, url });
  });

  const imageAttachments = attachments.filter((a) => IMAGE_EXT.test(a.name)).length;
  return { title, body, attachments, imageCount: countBodyImages($, bodyEl) + imageAttachments };
}

export function contentHash(title: string, body: string): string {
  return createHash("sha256").update(`${title}\n${body}`).digest("hex");
}

export type CollectMode = "quick" | "full" | "backfill";
export type CollectOptions = { mode: CollectMode; fromPage?: number; toPage?: number; skipExisting?: boolean };

export type CollectResult =
  | { ok: true; collectedCount: number }
  | { ok: false; reason: "ROBOTS_DISALLOWED" | "COLLECT_FAILED" | "ALREADY_RUNNING"; errorSummary: string };

// 5-1절 4번 — "검사 + insert" 구간만 트랜잭션 락으로 직렬화하고, 실행 중임은 running 행이 알린다.
async function startRun(triggerType: string, triggeredBy: string | null): Promise<string | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const lock = await client.query<{ locked: boolean }>(`select pg_try_advisory_xact_lock($1) as locked`, [
      COLLECT_LOCK_KEY,
    ]);
    if (!lock.rows[0]?.locked) {
      await client.query("rollback");
      return null;
    }
    await client.query(
      `update collect_runs set status = 'failed', finished_at = now(), error_summary = 'STALE_RUNNING'
        where status = 'running' and finished_at is null
          and started_at < now() - ($1 || ' minutes')::interval`,
      [String(STALE_RUNNING_MINUTES)],
    );
    const running = await client.query(
      `select 1 from collect_runs where status = 'running' and finished_at is null limit 1`,
    );
    if (running.rows.length > 0) {
      await client.query("rollback");
      return null;
    }
    const inserted = await client.query<{ id: string }>(
      `insert into collect_runs (trigger_type, status, triggered_by) values ($1, 'running', $2) returning id`,
      [triggerType, triggeredBy],
    );
    await client.query("commit");
    return inserted.rows[0].id;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function pageRange(opts: CollectOptions): [number, number] {
  if (opts.mode === "quick") return [1, 1];
  if (opts.mode === "full") return [1, 2];
  return [opts.fromPage ?? 1, opts.toPage ?? DEFAULT_BACKFILL_LAST_PAGE];
}

// opts를 생략하면 full과 같다(5-1절 2번).
export async function runCollectJob(
  triggerType: "scheduled" | "manual",
  triggeredBy: string | null,
  opts: CollectOptions = { mode: "full" },
): Promise<CollectResult> {
  const runId = await startRun(triggerType, triggeredBy);
  if (!runId) return { ok: false, reason: "ALREADY_RUNNING", errorSummary: "ALREADY_RUNNING" };

  try {
    const headers = { "user-agent": userAgent() };
    const robotsRes = await fetch(`${BOARD_ORIGIN}/robots.txt`, { headers });
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

    // robots.txt 다음의 모든 요청(목록 포함) 앞에 간격을 둔다.
    const getHtml = async (url: string): Promise<string> => {
      await sleep(delayMs);
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return res.text();
    };

    const skipExisting = opts.mode === "quick" || (opts.mode === "backfill" && opts.skipExisting === true);
    const [fromPage, toPage] = pageRange(opts);
    const seen = new Set<string>();
    let collectedCount = 0;

    for (let page = fromPage; page <= toPage; page++) {
      const items = parseListPage(await getHtml(`${BOARD_URL}&pageIndex=${page}`)).filter((i) => !seen.has(i.url));
      if (items.length === 0) break; // 빈 페이지면 남은 페이지는 요청하지 않는다.
      items.forEach((i) => seen.add(i.url));

      // 숨김 공지도 포함해 한 번에 조회한다(숨김 글을 다시 받지 않는다).
      const { rows: existingRows } = await pool.query<{ id: string; source_url: string; content_hash: string }>(
        `select id, source_url, content_hash from notices where source_url = any($1)`,
        [items.map((i) => i.url)],
      );
      const existing = new Map(existingRows.map((r) => [r.source_url, r]));

      for (const item of items) {
        const known = existing.get(item.url);
        if (known && skipExisting) continue;

        const detail = parseDetailPage(await getHtml(item.url));
        const title = detail.title || item.title;
        const hash = contentHash(title, detail.body);
        const attachmentsJson = JSON.stringify(detail.attachments);

        if (known && known.content_hash === hash) {
          // 본문이 같으면 메타데이터 4개만 갱신한다(collected_at·notice_chunks는 그대로).
          await pool.query(
            `update notices set is_pinned = $2, image_count = $3, attachments = $4::jsonb, published_at = coalesce($5, published_at)
              where id = $1`,
            [known.id, item.isPinned, detail.imageCount, attachmentsJson, item.publishedAt],
          );
          continue;
        }

        await pool.query(
          `insert into notices (source_url, title, body, content_hash, published_at, is_pinned, image_count, attachments)
           values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
           on conflict (source_url) do update
             set title = excluded.title, body = excluded.body, content_hash = excluded.content_hash,
                 published_at = coalesce(excluded.published_at, notices.published_at), is_pinned = excluded.is_pinned,
                 image_count = excluded.image_count, attachments = excluded.attachments, collected_at = now()`,
          [item.url, title, detail.body, hash, item.publishedAt, item.isPinned, detail.imageCount, attachmentsJson],
        );

        if (known) {
          // 5절 흐름 5 — 변경된 공지는 재임베딩 큐에 다시 올라야 한다. notice_chunks.embedding은
          // NOT NULL이라 null로 되돌릴 수 없으므로, 기존 청크를 지워 embed-job의 "청크 없는
          // 공지" 대기열에 다시 걸리게 한다.
          await pool.query(`delete from notice_chunks where notice_id = $1`, [known.id]);
        }
        collectedCount++;
      }
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
