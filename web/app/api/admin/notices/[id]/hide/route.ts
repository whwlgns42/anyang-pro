import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

type Params = { params: Promise<{ id: string }> };

// anyang-backend-api 13-1절 — 공지 숨김(쿼리 조건 방식, 물리 삭제 없음).
export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { hidden_reason?: unknown } | null;
  const hiddenReason = typeof body?.hidden_reason === "string" ? body.hidden_reason : null;

  await pool.query(`update notices set hidden_at = now(), hidden_reason = $2 where id = $1`, [
    id,
    hiddenReason,
  ]);

  return NextResponse.json({ id, hidden: true });
}
