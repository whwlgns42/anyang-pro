import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

// anyang-backend-api 1-3절 — 탈퇴. consents는 즉시 삭제하지 않고 withdrawn_at만 채운 뒤
// users를 삭제한다(순서 고정 — 바뀌면 user_id가 먼저 null이 되어 특정할 수 없다).
// 정지·재동의 여부와 무관하게 항상 허용한다(skipSuspended, skipConsent).
export async function DELETE() {
  const authResult = await requireUser({ skipSuspended: true, skipConsent: true });
  if (authResult instanceof Response) return authResult;

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "update consents set withdrawn_at = now() where user_id = $1 and withdrawn_at is null",
      [authResult.userId],
    );
    await client.query("delete from users where id = $1", [authResult.userId]);
    await client.query("commit");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
