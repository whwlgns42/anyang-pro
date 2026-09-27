import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

type Params = { params: Promise<{ id: string }> };

// anyang-backend-api 3-1절 — 특정 대화의 과거 메시지 목록(본인 대화만).
export async function GET(_request: NextRequest, { params }: Params) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;
  const { id } = await params;

  const owned = await pool.query(
    `select id from conversations where id = $1 and user_id = $2`,
    [id, authResult.userId],
  );
  if (owned.rows.length === 0) {
    return NextResponse.json(null, { status: 404 });
  }

  const { rows } = await pool.query(
    `select id, role, content, created_at
       from messages
      where conversation_id = $1
      order by created_at asc`,
    [id],
  );
  return NextResponse.json(rows);
}
