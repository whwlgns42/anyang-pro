// anyang-frontend-screens "PWA — manifest·서비스워커" 절: 푸시 수신·표시, 클릭 시 포커스만
// 담당한다. 오프라인 캐싱 전략은 요청 범위 밖(YAGNI).
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "안양 청년정책 비서", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "안양 청년정책 비서", {
      body: payload.body,
      data: { url: payload.url || "/notices" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notices";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
