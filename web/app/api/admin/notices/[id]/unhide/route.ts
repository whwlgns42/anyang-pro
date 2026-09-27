import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

type Params = { params: Promise<{ id: string }> };

// anyang-backend-api 13-1절 — 공지 숨김 해제.
export async function PATCH(_request: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;

  await pool.query(`update notices set hidden_at = null, hidden_reason = null where id = $1`, [
    id,
  ]);

  return NextResponse.json({ id, hidden: false });
}
