import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

// anyang-backend-api 13-3절 — 사용자 목록. 대화·기억 원문 비노출 원칙에 따라 필드를
// id/email/created_at/suspended_at로 최소화한다.
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { rows } = await pool.query(
    `select id, email, created_at, suspended_at
       from users
      order by created_at desc
      limit 100`,
  );
  return NextResponse.json(rows);
}
