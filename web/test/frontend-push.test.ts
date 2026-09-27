import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array, subscriptionToPayload } from "@/app/_lib/push";

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
