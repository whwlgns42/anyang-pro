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

// sw.js가 받는 push payload를 알림 표시 내용으로 변환한다. 서버는
// { title, notice_id }를 보낸다(app/api/jobs/notify/route.ts). 이동 대상은
// anyang-frontend-screens 4절에 확정된 공지 상세 라우트 `/notices/[id]`를 따른다.
// sw.js는 이 파일을 import할 수 없으므로(서비스워커는 별도 스크립트 컨텍스트) 같은
// 로직을 그대로 복제해 두되, 테스트는 여기서 한다.
export function parsePushPayload(payload: { title?: string; notice_id?: string }): {
  title: string;
  url: string;
} {
  return {
    title: payload.title || "안양 청년정책 비서",
    url: payload.notice_id ? `/notices/${payload.notice_id}` : "/notices",
  };
}

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
