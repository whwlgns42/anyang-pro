"use client";

import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../../../_lib/api-fetch";
import { formatNotifyTime } from "../../../_lib/format";
import { needsHomeScreenInstall, readInstallEnv } from "../../../_lib/install-state";
import { describeTestResult, type TestResult } from "../../../_lib/test-notify";
import { urlBase64ToUint8Array, subscriptionToPayload } from "../../../_lib/push";
import { Button, SettingsGroup, Switch } from "../../../_components/ui/controls";
import { Icon } from "../../../_components/ui/icon";
import { ScreenHeader } from "../../../_components/ui/screen";

type NotifySettings = { notify_time: string; enabled: boolean } | null;

const RULES = [
  "알림을 켠 뒤 올라온 공지만 보내요.",
  "같은 공지는 한 번만 보내요.",
  "정한 시각에서 5분 안에 도착해요.",
  "아직 대화를 하지 않았다면 알림이 가지 않아요.",
];

// anyang-frontend-screens "청안 디자인 적용 화면 스펙" 4번. 푸시 구독·권한·재구독 로직은 기존
// 그대로(on/off + 자유 시각 <input type="time">, VAPID 공개키는 NEXT_PUBLIC_VAPID_PUBLIC_KEY)이고
// 외형과 iOS 홈 화면 추가 안내만 바꿨다.
export function NotificationsClient() {
  const [enabled, setEnabled] = useState(false);
  const [notifyTime, setNotifyTime] = useState("09:00");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsResubscribe, setNeedsResubscribe] = useState(false);
  const [installRequired, setInstallRequired] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 사용자 에이전트는 마운트 뒤에만 읽는다(서버 렌더와의 불일치 방지).
  useEffect(() => {
    setInstallRequired(needsHomeScreenInstall(readInstallEnv()));
  }, []);

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

  // 확인 항목 58: 서버가 동시 두 요청을 막지 못하므로 testing 동안의 비활성이 중복 전송을 막는다.
  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    let status = 0;
    let body: unknown = null;
    try {
      const res = await apiFetch("/api/notify-settings/test", { method: "POST" });
      status = res.status;
      body = await res.json().catch(() => null);
    } catch {
      // 네트워크 오류는 (0, null)로 처리한다.
    }
    setTestResult(describeTestResult(status, body));
    setTesting(false);
  }

  const disabled = installRequired;
  const status = disabled
    ? "홈 화면에 추가한 뒤 켤 수 있어요"
    : enabled
      ? `매일 ${formatNotifyTime(notifyTime)}에 보내요`
      : "꺼져 있어요";

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <ScreenHeader title="알림" description="관심사와 가까운 새 공지가 있을 때만 보내요." />

        {loading ? (
          <p className="m-0 px-gutter text-body-sm text-ink-2">불러오는 중...</p>
        ) : (
          <div className={`flex flex-col px-gutter pb-6 ${disabled ? "gap-5" : "gap-7"}`}>
            {needsResubscribe && !disabled && (
              <div className="flex flex-col items-start gap-3 rounded-control border border-rule bg-surface px-4 py-3.5 text-body-sm">
                <span>알림이 켜져 있지만 이 기기의 구독이 끊어졌어요.</span>
                <Button variant="secondary" onClick={() => subscribePush()}>
                  알림 다시 켜기
                </Button>
              </div>
            )}

            <SettingsGroup>
              <div className="flex items-center gap-3 py-3 pr-2 pl-4">
                <div className="flex flex-1 flex-col gap-0.5">
                  <span id="alert-label" className="text-title">
                    새 공지 알림
                  </span>
                  <span id="alert-status" className="text-label font-normal text-ink-2">
                    {status}
                  </span>
                </div>
                <Switch
                  checked={!disabled && enabled}
                  onChange={handleToggle}
                  disabled={disabled}
                  labelledBy="alert-label"
                  describedBy="alert-status"
                />
              </div>
              <div className={`flex items-center gap-3 py-1 pr-4 pl-4 ${disabled ? "text-ink-3" : ""}`}>
                <label htmlFor="notify-time" className="flex-1 text-title font-normal">
                  받을 시각
                </label>
                <input
                  id="notify-time"
                  type="time"
                  value={notifyTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={disabled || !enabled}
                  className="h-touch rounded-none border-0 bg-transparent px-1 text-title font-normal text-inherit disabled:text-ink-3"
                />
              </div>
            </SettingsGroup>

            {enabled && !disabled && (
              <section className="flex flex-col items-start gap-2">
                <h2 className="m-0 text-label font-semibold text-ink-2">알림 확인</h2>
                <p className="m-0 text-body-sm text-ink-2">지금 알림이 오는지 확인해 보세요.</p>
                <Button variant="secondary" onClick={sendTest} disabled={testing} aria-busy={testing}>
                  {testing ? "보내는 중..." : "테스트 알림 보내기"}
                </Button>
                {testResult && (
                  <p
                    role="status"
                    className={`m-0 text-body-sm ${testResult.kind === "success" || testResult.kind === "no-subscription" || testResult.kind === "retry" ? "text-ink-2" : "text-danger"}`}
                  >
                    {testResult.message}
                  </p>
                )}
              </section>
            )}

            {error && (
              <p className="m-0 rounded-control border border-rule bg-surface px-4 py-3 text-body-sm font-medium text-danger" role="alert">
                {error}
              </p>
            )}

            {disabled ? (
              <InstallGuide />
            ) : (
              <section className="flex flex-col gap-2">
                <h2 className="m-0 text-label font-semibold text-ink-2">이렇게 보내요</h2>
                <ul className="m-0 list-none border-t border-rule p-0">
                  {RULES.map((rule) => (
                    <li key={rule} className="border-b border-rule py-3 text-body">
                      {rule}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function InstallGuide() {
  return (
    <section className="flex flex-col gap-4 rounded-control border border-rule bg-surface px-4 py-5">
      <h2 className="m-0 font-display text-heading">iPhone에서는 홈 화면에 추가해야 알림을 받을 수 있어요</h2>
      <ol className="m-0 flex list-none flex-col gap-3 p-0 text-body">
        <Step n={1}>
          <span className="inline-flex flex-wrap items-center gap-x-1">
            Safari에서 공유 버튼
            <Icon name="share" size={18} label="공유 아이콘" />을 누르세요.
          </span>
        </Step>
        <Step n={2}>&apos;홈 화면에 추가&apos;를 고르세요.</Step>
        <Step n={3}>홈 화면에 생긴 청안을 열고, 이 화면에서 알림을 켜세요.</Step>
      </ol>
      <p className="m-0 text-label font-normal text-ink-3">iOS 16.4 이상에서 받을 수 있어요.</p>
    </section>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5">
      <span className="font-mono text-label leading-[inherit] font-medium text-accent">{n}</span>
      <span>{children}</span>
    </li>
  );
}
