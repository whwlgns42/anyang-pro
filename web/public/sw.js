// anyang-frontend-screens "PWA — manifest·서비스워커" 절: 푸시 수신·표시, 클릭 시 포커스만
// 담당한다. 오프라인 캐싱 전략은 요청 범위 밖(YAGNI).
// 서버(app/api/jobs/notify/route.ts)는 { title, notice_id }를 보낸다. 이동 대상은
// anyang-frontend-screens 4절에 확정된 공지 상세 라우트 `/notices/[id]`를 따른다.
// 이 함수가 원본이다(app/_lib/push.ts는 이 파일을 import할 수 없어 복제하지 않는다).
// 테스트는 web/test/frontend-push.test.ts에서 이 소스를 직접 읽어 검증한다.
function parsePushPayload(payload) {
  return {
    title: payload.title || "안양 청년정책 비서",
    url: payload.notice_id ? `/notices/${payload.notice_id}` : "/notices",
  };
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let raw;
  try {
    raw = event.data.json();
  } catch {
    raw = { title: event.data.text() };
  }
  const { title, url } = parsePushPayload(raw);
  event.waitUntil(self.registration.showNotification(title, { data: { url } }));
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
