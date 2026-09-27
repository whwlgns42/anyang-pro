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

// Web Push 표준: 410(Gone)/404(Not Found)는 브라우저·OS가 구독을 이미 폐기했다는 뜻이라
// 재시도해도 절대 성공하지 않는다. 호출부가 이 상태 코드로 죽은 구독을 지울 수 있게 판별만
// 제공한다(설계 8절에 명시는 없으나 Web Push 표준 처리).
export function isGoneSubscriptionError(err: unknown): boolean {
  const status = (err as { statusCode?: number } | null)?.statusCode;
  return status === 410 || status === 404;
}
