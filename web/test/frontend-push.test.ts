import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array, subscriptionToPayload } from "@/app/_lib/push";

// sw.js는 서비스워커 전용 스크립트라 import할 수 없고, self.addEventListener(...) 부분은
// Node 테스트 환경(self 없음)에서 실행할 수 없다. parsePushPayload 함수 정의만 잘라내
// 평가해, 복제본이 아닌 진짜 sw.js 소스를 검증한다.
const swSource = readFileSync(path.join(__dirname, "../public/sw.js"), "utf-8");
const fnSource = swSource.slice(0, swSource.indexOf("self.addEventListener"));
const parsePushPayload: (payload: { title?: string; notice_id?: string; url?: unknown }) => {
  title: string;
  url: string;
} = new Function(`${fnSource}\nreturn parsePushPayload;`)();

describe("urlBase64ToUint8Array", () => {
  it("decodes a base64url VAPID-like key into bytes", () => {
    // "Zm9v" == base64("foo"); base64url form is identical here (no -/_ chars).
    const bytes = urlBase64ToUint8Array("Zm9v");
    expect(Array.from(bytes)).toEqual([102, 111, 111]);
  });

  it("handles base64url -/_ characters and missing padding", () => {
    // base64("\xfb\xff") = "+/8=" -> base64url = "-_8"
    const bytes = urlBase64ToUint8Array("-_8");
    expect(Array.from(bytes)).toEqual([0xfb, 0xff]);
  });
});

describe("subscriptionToPayload", () => {
  it("extracts endpoint/p256dh/auth from a PushSubscription-like object", () => {
    const fakeSub = {
      toJSON: () => ({
        endpoint: "https://push.example/abc",
        keys: { p256dh: "p-key", auth: "a-key" },
      }),
    } as unknown as PushSubscription;
    expect(subscriptionToPayload(fakeSub)).toEqual({
      endpoint: "https://push.example/abc",
      p256dh: "p-key",
      auth: "a-key",
    });
  });
});

describe("parsePushPayload", () => {
  it("builds the notice detail url from notice_id (jobs/notify route shape)", () => {
    expect(parsePushPayload({ title: "새 공지", notice_id: "abc-123" })).toEqual({
      title: "새 공지",
      url: "/notices/abc-123",
    });
  });

  it("uses a safe same-origin url (test notification payload)", () => {
    expect(
      parsePushPayload({ title: "테스트 알림입니다", url: "/settings/notifications" }),
    ).toEqual({ title: "테스트 알림입니다", url: "/settings/notifications" });
  });

  it("ignores unsafe or malformed url and falls back to the existing rules", () => {
    for (const url of ["//evil.com", "https://evil.com", "/\\evil.com", "settings", 5, ""]) {
      expect(parsePushPayload({ url }).url).toBe("/notices");
      expect(parsePushPayload({ url, notice_id: "n1" }).url).toBe("/notices/n1");
    }
  });

  it("prefers url over notice_id when both are present", () => {
    expect(parsePushPayload({ url: "/a", notice_id: "n1" }).url).toBe("/a");
  });

  it("falls back to a default title and the notices list url", () => {
    expect(parsePushPayload({})).toEqual({
      title: "안양 청년정책 비서",
      url: "/notices",
    });
  });
});
