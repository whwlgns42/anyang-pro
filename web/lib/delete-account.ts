import { pool } from "./db";

// anyang-backend-api 1-3절/13-3절 공용 — 탈퇴(본인) / 관리자 대신 삭제가 같은 순서를 쓴다.
// consents는 즉시 삭제하지 않고 withdrawn_at만 채운 뒤 users를 삭제한다(순서 고정 — 바뀌면
// user_id가 먼저 null이 되어 특정할 수 없다).
export async function deleteUserAccount(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "update consents set withdrawn_at = now() where user_id = $1 and withdrawn_at is null",
      [userId],
    );
    await client.query("delete from users where id = $1", [userId]);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
