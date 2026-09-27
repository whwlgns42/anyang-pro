import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

type Params = { params: Promise<{ id: string }> };

// anyang-backend-api 13-3절 — 계정 정지 해제.
export async function PATCH(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;

  await pool.query(`update users set suspended_at = null where id = $1`, [id]);
  return NextResponse.json({ id, suspended: false });
}
