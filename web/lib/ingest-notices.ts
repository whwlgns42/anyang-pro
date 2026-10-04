import { contentHash } from "./notice-parser";
import type { NoticeInput } from "./notice-store";

// anyang-board-collector C-2·C-3 — 받기 API 입력 검증. 서버는 파싱하지 않고 검증만 한다.
export const MAX_ITEMS = 20;
export const MAX_BODY_BYTES = 4 * 1024 * 1024;
export const REPORT_CODES = ["ip_blocked", "empty_list", "parse_failed", "fetch_failed", "robots_disallowed"] as const;
export const KINDS = ["quick", "full", "backfill", "sync"] as const;
export type Kind = (typeof KINDS)[number];
export type ReportCode = (typeof REPORT_CODES)[number];
export type RejectCode = "INVALID_FIELD" | "INVALID_URL" | "HASH_MISMATCH";

const SOURCE_URL_RE = /^https:\/\/www\.anyang\.go\.kr\/youth\/selectBbsNttView\.do\?key=3543&bbsNo=1184&nttNo=\d+$/;
const ATTACH_URL_PREFIX = "https://www.anyang.go.kr/";
const NUL = "\u0000";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown, min: number, max: number): v is string =>
  typeof v === "string" && v.length >= min && v.length <= max && !v.includes(NUL);

function isCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function validateItem(raw: unknown): { ok: true; item: NoticeInput } | { ok: false; code: RejectCode } {
  const bad = (code: RejectCode) => ({ ok: false as const, code });
  if (!isObj(raw)) return bad("INVALID_FIELD");
  const { source_url, title, body, content_hash, published_at, is_pinned, image_count, attachments } = raw;

  if (typeof source_url !== "string" || !SOURCE_URL_RE.test(source_url)) return bad("INVALID_URL");
  if (!isStr(title, 1, 500) || title.trim().length === 0) return bad("INVALID_FIELD");
  if (!isStr(body, 0, 200_000)) return bad("INVALID_FIELD");
  if (typeof content_hash !== "string" || !/^[0-9a-f]{64}$/.test(content_hash)) return bad("INVALID_FIELD");
  if (published_at !== null && (typeof published_at !== "string" || !isCalendarDate(published_at))) {
    return bad("INVALID_FIELD");
  }
  if (typeof is_pinned !== "boolean") return bad("INVALID_FIELD");
  if (typeof image_count !== "number" || !Number.isInteger(image_count) || image_count < 0 || image_count > 1000) {
    return bad("INVALID_FIELD");
  }
  if (!Array.isArray(attachments) || attachments.length > 50) return bad("INVALID_FIELD");
  const seen = new Set<string>();
  const atts: { name: string; url: string }[] = [];
  for (const a of attachments) {
    if (!isObj(a) || !isStr(a.name, 1, 300) || typeof a.url !== "string" || a.url.includes(NUL)) {
      return bad("INVALID_FIELD");
    }
    if (!a.url.startsWith(ATTACH_URL_PREFIX) || !a.url.includes("downloadBbsFile.do") || seen.has(a.url)) {
      return bad("INVALID_FIELD");
    }
    seen.add(a.url);
    atts.push({ name: a.name, url: a.url });
  }
  // 해시는 서버가 다시 계산한다 — 정의가 notice-parser 한 곳이라 비용이 없다.
  if (contentHash(title, body) !== content_hash) return bad("HASH_MISMATCH");

  return {
    ok: true,
    item: { source_url, title, body, content_hash, published_at, is_pinned, image_count, attachments: atts },
  };
}

export type ParsedRequest = {
  kind: Kind;
  items: unknown[];
  report: { status: "success" } | { status: "failed"; error_code: ReportCode } | null;
};

// 요청 전체 형식 검사. 실패하면 null(400 INVALID_BODY).
export function parseRequest(json: unknown): ParsedRequest | null {
  if (!isObj(json)) return null;
  const { kind, items, report } = json;
  if (!KINDS.includes(kind as Kind) || !Array.isArray(items) || items.length > MAX_ITEMS) return null;
  let rep: ParsedRequest["report"] = null;
  if (report !== undefined) {
    if (!isObj(report)) return null;
    if (report.status === "success") {
      // 보고 전용 호출(full의 일일 보고)만 허용: error_code 없음, items 비어 있음.
      if (report.error_code !== undefined || items.length > 0) return null;
      rep = { status: "success" };
    } else if (report.status === "failed" && REPORT_CODES.includes(report.error_code as ReportCode)) {
      rep = { status: "failed", error_code: report.error_code as ReportCode };
    } else return null;
  }
  if (items.length === 0 && !rep) return null; // 보드 버그
  return { kind: kind as Kind, items, report: rep };
}
