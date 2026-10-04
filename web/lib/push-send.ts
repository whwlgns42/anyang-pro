import { pool } from "@/lib/db";
import { sendPushNotification, isGoneSubscriptionError } from "@/lib/web-push";

export type SendResult = { successCount: number; failedCount: number; lastError?: unknown; deviceCount: number };

// anyang-backend-api 7절(확인 항목 30)·8-1절 — 사용자 전 기기에 payload를 보낸다. 기기 1대 실패로
// 나머지가 막히지 않게 끝까지 시도하고, 410/404는 구독을 지우며 성공·실패 어느 쪽에도 세지 않는다.
// deviceCount는 발송 시작 시점의 구독 수(0이면 시도 없음).
export async function sendToUserDevices(userId: string, payloadOrBuilder: string | (() => Promise<string>)): Promise<SendResult> {
  const { rows: devices } = await pool.query<{ endpoint: string; p256dh: string; auth: string }>(
    `select endpoint, p256dh, auth from push_subscriptions where user_id = $1`,
    [userId],
  );
  // 구독이 0개면 payload를 만들지 않는다(공지 제목 조회 생략, 7절 기존 동작).
  const payload = devices.length === 0 ? "" : typeof payloadOrBuilder === "string" ? payloadOrBuilder : await payloadOrBuilder();
  let successCount = 0;
  let failedCount = 0;
  let lastError: unknown;
  for (const device of devices) {
    try {
      await sendPushNotification(device, payload);
      successCount++;
    } catch (err) {
      if (isGoneSubscriptionError(err)) {
        await pool.query(`delete from push_subscriptions where endpoint = $1`, [device.endpoint]);
        continue;
      }
      failedCount++;
      lastError = err;
    }
  }
  return { successCount, failedCount, lastError, deviceCount: devices.length };
}
