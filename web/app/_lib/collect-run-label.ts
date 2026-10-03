// anyang-frontend-screens 11절 "56 개정": 서버 값은 그대로 두고 화면에서만 읽기 쉬운 글로 바꾼다.
// 표에 없는 값은 원문 그대로 보인다(지어내지 않는다).

export type RunLabel = {
  trigger: string;
  status: string;
  count: string;
  /** 결과 설명. null이면 아무것도 표시하지 않는다. */
  message: { text: string; raw: string | null; tone: "error" | "hint" } | null;
};

const pick = (t: Record<string, string>, k: string) => (Object.hasOwn(t, k) ? t[k] : k);
const TRIGGER: Record<string, string> = { manual: "수동", scheduled: "자동" };
const STATUS: Record<string, string> = { success: "성공", failed: "실패", running: "실행 중" };
const CODE_TEXT: Record<string, string> = {
  ip_blocked: "안양시 사이트가 접속을 막았어요(IP 차단). 새 공지를 가져오지 못했습니다.",
  empty_list: "공지 목록이 비어 있어요. 사이트 응답이 바뀌었을 수 있습니다.",
  parse_failed: "일부 공지의 본문을 읽지 못해 건너뛰었어요.",
  fetch_failed: "안양시 사이트 요청이 실패했어요(오류 또는 시간 초과).",
  robots_disallowed: "사이트의 robots.txt가 수집을 허용하지 않아요.",
};

export const DIRECT_COLLECT_DISABLED_NOTICE =
  "이 서버에서는 직접 수집이 꺼져 있어요. 공지 수집은 보드가 자동으로 합니다. 결과는 아래 실행 이력에서 확인하세요.";
export const HISTORY_HINT = "보드가 새 공지를 보냈을 때와 하루 한 번 점검 때 기록이 남아요.";

export function isDirectCollectDisabled(status: number, body: unknown): boolean {
  return (
    status === 410 &&
    typeof body === "object" &&
    body !== null &&
    (body as { error?: unknown }).error === "DIRECT_COLLECT_DISABLED"
  );
}

function describeSummary(summary: string | null): RunLabel["message"] {
  if (!summary) return null;
  const first = summary.split(/\s+/)[0];
  if (Object.hasOwn(CODE_TEXT, first)) return { text: CODE_TEXT[first], raw: summary, tone: "error" };
  const m = /^rejected=(\d+), error=(\d+)$/.exec(summary);
  if (m) return { text: `일부 항목을 저장하지 못했어요 (거부 ${m[1]}건, 일시 오류 ${m[2]}건).`, raw: null, tone: "hint" };
  return { text: summary, raw: null, tone: "error" };
}

export function describeRun(run: {
  trigger_type: string;
  status: string;
  collected_count: number | null;
  error_summary: string | null;
}): RunLabel {
  return {
    trigger: pick(TRIGGER, run.trigger_type),
    status: pick(STATUS, run.status),
    count: run.collected_count === null ? "-" : `새 글·바뀐 글 ${run.collected_count}건`,
    message: describeSummary(run.error_summary),
  };
}
