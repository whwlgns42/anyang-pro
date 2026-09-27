import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

// anyang-backend-api 2-3절 — "AI가 기억하는 내 정보" 목록 조회.
export async function GET() {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const { rows } = await pool.query(
    `select id, preference_text, updated_at
       from user_preferences
      where user_id = $1
      order by updated_at desc`,
    [authResult.userId],
  );
  return NextResponse.json(rows);
}
