import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

// anyang-backend-api 2-1절 — 추천 공지 피드. 선호(user_preferences) 벡터와 notice_chunks
// 유사도 기반, 프로필은 임베딩하지 않는다(3절/7절과 같은 방식). 선호가 없는 신규 사용자는
// 최신 공지 순으로 대체한다(설계 확정).
const DEFAULT_PAGE_SIZE = 20; // 설계 제안값(N 미확정)
const MAX_PAGE_SIZE = 50;
const EXCERPT_LENGTH = 100; // 설계 제안값(길이 미확정)

function averageVectors(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0) as number[];
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  return sum.map((s) => s / vectors.length);
}

function parsePagination(request: NextRequest): { limit: number; offset: number } {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(searchParams.get("page_size") ?? "", 10) || DEFAULT_PAGE_SIZE),
  );
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

type NoticeRow = { id: string; title: string; body: string; published_at: Date | null };

function toListItem(row: NoticeRow) {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.body.slice(0, EXCERPT_LENGTH),
    posted_at: row.published_at,
  };
}

export async function GET(request: NextRequest) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const { limit, offset } = parsePagination(request);

  const { rows: prefRows } = await pool.query<{ embedding: string }>(
    `select embedding from user_preferences where user_id = $1 order by updated_at desc limit 5`,
    [authResult.userId],
  );

  if (prefRows.length === 0) {
    // 선호 없는 신규 사용자: 최신 공지 순(설계 확정).
    const { rows } = await pool.query<NoticeRow>(
      `select id, title, body, published_at
         from notices
        where hidden_at is null
        order by collected_at desc
        limit $1 offset $2`,
      [limit, offset],
    );
    return NextResponse.json(rows.map(toListItem));
  }

  const avgPref = averageVectors(prefRows.map((r) => JSON.parse(r.embedding) as number[]));

  const { rows } = await pool.query<NoticeRow>(
    `select id, title, body, published_at from (
       select distinct on (n.id) n.id, n.title, n.body, n.published_at,
              nc.embedding <=> $1 as distance
         from notice_chunks nc
         join notices n on n.id = nc.notice_id
        where n.hidden_at is null
        order by n.id, distance
     ) matched
     order by distance asc
     limit $2 offset $3`,
    [JSON.stringify(avgPref), limit, offset],
  );

  return NextResponse.json(rows.map(toListItem));
}
