import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";
import { claimTestNotifySlot } from "@/lib/auth-attempts";
import { sendToUserDevices } from "@/lib/push-send";

// anyang-backend-api 8-1절(확인 항목 58) — 본인 구독 전체에 테스트 푸시 1건. notify_logs 미기록.
const TEST_PAYLOAD = JSON.stringify({ title: "테스트 알림입니다", url: "/settings/notifications" });

export async function POST() {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const { rows } = await pool.query(`select 1 from push_subscriptions where user_id = $1 limit 1`, [userId]);
  if (rows.length === 0) return NextResponse.json({ error: "NO_SUBSCRIPTION" }, { status: 409 });

  if (!(await claimTestNotifySlot(userId))) {
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }

  const { successCount, failedCount } = await sendToUserDevices(userId, TEST_PAYLOAD);
  return NextResponse.json({ success_count: successCount, failed_count: failedCount });
}
