import webpush from "web-push";

// anyang-backend-api 8절 — VAPID 표준 web-push 라이브러리. subject는 APP_ORIGIN 기준
// (배포 시 값이 채워진다, 도메인 미확정 상태에서는 mailto: 폴백).
let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY missing");
  }
  const origin = process.env.APP_ORIGIN;
  const subject = origin ? (origin.startsWith("http") ? origin : `https://${origin}`) : "mailto:admin@example.com";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushSubscriptionRecord = { endpoint: string; p256dh: string; auth: string };

export async function sendPushNotification(sub: PushSubscriptionRecord, payload: string): Promise<void> {
  ensureConfigured();
  await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
}
