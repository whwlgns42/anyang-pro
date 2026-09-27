// Web Push 구독에 필요한 VAPID 공개키 변환(표준 base64url → Uint8Array). 서드파티 라이브러리
// 없이 표준 웹 API만으로 처리한다(YAGNI).
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// push payload 파싱(parsePushPayload)은 public/sw.js에만 있다. 서비스워커는 별도 스크립트
// 컨텍스트라 이 파일을 import할 수 없어 sw.js 쪽이 원본이다. 테스트는 sw.js 소스를 직접
// 읽어 검증한다(web/test/frontend-push.test.ts).
export function subscriptionToPayload(sub: PushSubscription): {
  endpoint: string;
  p256dh: string;
  auth: string;
} {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint ?? "",
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  };
}
