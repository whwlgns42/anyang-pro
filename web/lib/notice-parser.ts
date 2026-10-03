import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

// anyang-backend-api 5·5-1절 — 공지 수집기. 대상 게시판 URL은 확정, robots.txt 준수와 요청 간격은
// 코드에 포함. HTML 구조는 2026-09-28 메인 세션 확인 + 2026-10-04 실측 기준(목록 selectBbsNttList.do?bbsNo=1184&key=3543,
// 상세 selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=...). 상세 페이지에는 게시일이 없어 목록의
// <time> 값을 그대로 쓴다.
export const BOARD_ORIGIN = "https://www.anyang.go.kr";
export const BOARD_PATH = "/youth/selectBbsNttList.do";
const BBS_NO = "1184";
const BBS_KEY = "3543";
export const BOARD_URL = `${BOARD_ORIGIN}${BOARD_PATH}?bbsNo=${BBS_NO}&key=${BBS_KEY}`;
export const DEFAULT_REQUEST_DELAY_MS = 2000;
// 5-1절 8번 — 문의 연락처는 환경변수 COLLECTOR_CONTACT로 받는다. 없으면 연락처 없이 보낸다.
export function userAgent(): string {
  const contact = process.env.COLLECTOR_CONTACT?.trim();
  return contact ? `anyang-youth-policy-bot/1.0 (+contact: ${contact})` : "anyang-youth-policy-bot/1.0";
}
// nttNo로 상세 URL을 정규화한다 — 목록 href에 붙는 부가 파라미터와 무관하게
// 같은 글이면 항상 같은 source_url이 되어야 source_url 고유성 규칙이 맞는다.
export function detailUrlFor(nttNo: string): string {
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

// anyang-board-collector A-4 3번 — 안양시가 클라우드 IP를 막으면 목록·상세 대신 차단 안내 페이지를 200으로 돌려준다.
// meta description의 문구로 판정한다(문구가 바뀌면 p-subject 0개 -> empty_list 판정이 받는다).
export function isBlockedPage(html: string): boolean {
  return (cheerio.load(html)('meta[name="description"]').attr("content") ?? "").includes("IP 차단");
}

// 상세 본문 칸(td.p-table__content) 존재 여부. 본문이 비어 있는 글(이미지만)은 칸이 있으므로 정상이다.
export function hasDetailContent(html: string): boolean {
  return cheerio.load(html)("td.p-table__content").length > 0;
}
