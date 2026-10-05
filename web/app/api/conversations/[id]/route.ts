import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// anyang-backend-api 3-1-1절 — 대화 삭제. 항상 204(멱등, 존재 여부 비노출).
// messages는 FK cascade, user_preferences.source_conversation_id는 0023 이후 set null.
// 0023 전 FK 위반(23503)은 잡지 않고 500으로 둔다(가짜 성공 금지).
export async function DELETE(_request: NextRequest, { params }: Params) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;
  const { id } = await params;

  if (UUID_RE.test(id)) {
    await pool.query(`delete from conversations where id = $1 and user_id = $2`, [
      id,
      authResult.userId,
    ]);
  }
  return new Response(null, { status: 204 });
}
