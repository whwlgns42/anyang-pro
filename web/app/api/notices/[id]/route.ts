import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

type Params = { params: Promise<{ id: string }> };

// anyang-backend-api 2-1절 — 공지 상세 1건. 숨김 공지(hidden_at)는 제외한다.
export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const { id } = await params;

  const { rows } = await pool.query<{
    id: string;
    title: string;
    body: string;
    source_url: string;
    published_at: Date | null;
    attachments: { name: string; url: string }[];
    image_count: number;
  }>(
    `select id, title, body, source_url, published_at, attachments, image_count
       from notices
      where id = $1 and hidden_at is null`,
    [id],
  );

  const notice = rows[0];
  if (!notice) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    id: notice.id,
    title: notice.title,
    body: notice.body,
    source_url: notice.source_url,
    posted_at: notice.published_at,
    attachments: notice.attachments ?? [],
    image_count: notice.image_count,
  }, { headers: { "Cache-Control": "no-store" } });
}
