import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

// anyang-backend-api 13-1절 — 공지 목록(숨김 포함, 페이지네이션). 관리자가 숨김/해제
// 대상을 고르기 전 전체 목록을 봐야 하는 화면용. 스키마 변경 없음(notices 테이블 그대로).
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { searchParams } = new URL(request.url);
  const pageRaw = searchParams.get("page");
  const pageSizeRaw = searchParams.get("page_size");
  const hiddenRaw = searchParams.get("hidden");

  const page = pageRaw === null ? 1 : Number(pageRaw);
  const pageSize = pageSizeRaw === null ? DEFAULT_PAGE_SIZE : Number(pageSizeRaw);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  if (hiddenRaw !== null && hiddenRaw !== "true" && hiddenRaw !== "false") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const hiddenFilter =
    hiddenRaw === "true" ? "hidden_at is not null" : hiddenRaw === "false" ? "hidden_at is null" : null;
  const whereClause = hiddenFilter ? `where ${hiddenFilter}` : "";
  const offset = (page - 1) * pageSize;

  const [{ rows: items }, { rows: countRows }] = await Promise.all([
    pool.query(
      `select id, title, source_url, published_at, collected_at, hidden_at, hidden_reason
         from notices
         ${whereClause}
        order by collected_at desc
        limit $1 offset $2`,
      [pageSize, offset],
    ),
    pool.query<{ count: string }>(`select count(*)::text as count from notices ${whereClause}`),
  ]);

  return NextResponse.json({
    items,
    page,
    page_size: pageSize,
    total_count: Number(countRows[0]?.count ?? 0),
  });
}
