import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

type Params = { params: Promise<{ id: string }> };

// anyang-backend-api 13-3절 — 계정 정지(이용 제한, 로그인 자체는 막지 않는다. 1-2절 참고).
export async function PATCH(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;

  await pool.query(`update users set suspended_at = now() where id = $1`, [id]);
  return NextResponse.json({ id, suspended: true });
}
