"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../_lib/api-fetch";
import { urlBase64ToUint8Array, subscriptionToPayload } from "../../../_lib/push";

type NotifySettings = { notify_time: string; enabled: boolean } | null;

// anyang-frontend-screens 5절: on/off + 자유 시각(<input type="time">), 푸시 권한 요청 흐름,
// 도메인 변경 재구독 유도. VAPID 공개키는 NEXT_PUBLIC_VAPID_PUBLIC_KEY로 클라이언트에 노출한다
// (설계가 열어둔 두 방법 중 하나를 택함 — 공개키는 비밀값이 아니므로 노출 자체는 안전, YAGNI로
// 별도 API 왕복을 추가하지 않는다).
export function NotificationsClient() {
  const [enabled, setEnabled] = useState(false);
  const [notifyTime, setNotifyTime] = useState("09:00");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsResubscribe, setNeedsResubscribe] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/notify-settings").then(async (res) => {
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as NotifySettings;
      if (data) {
        setEnabled(data.enabled);
        setNotifyTime(data.notify_time.slice(0, 5));
      }
      setLoading(false);

      if (data?.enabled && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub && !cancelled) setNeedsResubscribe(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribePush(): Promise<boolean> {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setError("알림 설정이 준비되지 않았습니다(VAPID 공개키 없음).");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError("브라우저 알림 권한이 필요합니다.");
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    const res = await apiFetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscriptionToPayload(sub)),
    });
    setNeedsResubscribe(false);
    return res.ok;
  }

  async function unsubscribePush() {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const payload = subscriptionToPayload(sub);
      await sub.unsubscribe();
      await apiFetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: payload.endpoint }),
      });
    }
  }

  async function handleToggle(next: boolean) {
    setError(null);
    if (next) {
      const ok = await subscribePush();
      if (!ok) {
        setEnabled(false);
        return;
      }
    } else {
      await unsubscribePush();
    }
    setEnabled(next);
    await save(next, notifyTime);
  }

  async function save(nextEnabled: boolean, nextTime: string) {
    const res = await apiFetch("/api/notify-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled, notify_time: nextTime }),
    });
    if (!res.ok && res.status !== 403) {
      setError("저장 중 오류가 발생했습니다.");
    }
  }

  function handleTimeChange(value: string) {
    setNotifyTime(value);
    save(enabled, value);
  }

  if (loading) {
    return (
      <main className="page">
        <p className="hint-text">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>알림 설정</h1>

      {needsResubscribe && (
        <div className="banner">
          알림이 켜져 있지만 이 기기의 구독이 끊어졌어요.{" "}
          <button type="button" onClick={() => subscribePush()}>
            알림 다시 켜기
          </button>
        </div>
      )}

      <div className="field">
        <label htmlFor="notify-enabled">
          <input
            id="notify-enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />{" "}
          공지 알림 받기
        </label>
      </div>

      <div className="field">
        <label htmlFor="notify-time">알림 시각</label>
        <input
          id="notify-time"
          type="time"
          value={notifyTime}
          onChange={(e) => handleTimeChange(e.target.value)}
          disabled={!enabled}
        />
      </div>

      <p className="hint-text">알림을 켠 시점 이후에 올라온 공지부터 알려드려요.</p>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
