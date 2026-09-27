import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

// anyang-backend-api 3-1절 — 대화 목록(최근 갱신 순). 대화 생성·title 자동 생성은 6절
// 채팅 구현(2차 묶음)에 딸려 있어 여기서는 다루지 않는다.
export async function GET() {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const { rows } = await pool.query(
    `select id, title, updated_at
       from conversations
      where user_id = $1
      order by updated_at desc`,
    [authResult.userId],
  );
  return NextResponse.json(rows);
}
