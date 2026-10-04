// anyang-frontend-screens 알림 절 "테스트 알림 보내기"(확인 항목 58). 응답을 화면 문구로 바꾸는 순수 함수.
// 네트워크 오류는 호출 쪽에서 (0, null)로 넘긴다.
export type TestResult = {
  kind: "success" | "no-subscription" | "retry" | "failed";
  message: string;
};

const FAILED = "알림을 보내지 못했어요. 잠시 후 다시 시도해 주세요.";
const NO_SUB = "알림을 받는 기기가 없어요. 알림을 껐다가 다시 켜 주세요.";

export function describeTestResult(status: number, body: unknown): TestResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (status === 429) return { kind: "retry", message: "잠시 후 다시 시도해 주세요." };
  if (status === 409 && b.error === "NO_SUBSCRIPTION") {
    return { kind: "no-subscription", message: NO_SUB };
  }
  if (status === 200 && Number.isInteger(b.success_count) && Number.isInteger(b.failed_count)) {
    const ok = b.success_count as number;
    const fail = b.failed_count as number;
    if (ok >= 1) {
      return {
        kind: "success",
        message: fail >= 1
          ? `${ok}대에 보냈어요. ${fail}대는 보내지 못했어요.`
          : `${ok}대에 테스트 알림을 보냈어요.`,
      };
    }
    if (fail === 0) return { kind: "no-subscription", message: NO_SUB };
  }
  return { kind: "failed", message: FAILED };
}
