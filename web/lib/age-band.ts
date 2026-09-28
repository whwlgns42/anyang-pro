// anyang-ai-models-data-transfer 결정 + anyang-backend-api 3절(확인 항목 28) — 청년정책
// 나이대 구간. DeepSeek에는 출생연도 원값이 아니라 이 라벨 문자열만 전달한다.
// 구간: 19세 미만 / 19~24 / 25~29 / 30~34 / 35~39 / 40세 이상 (하한 포함).
export function ageBandLabel(birthYear: number | null, now: Date = new Date()): string | null {
  if (birthYear == null) return null;

  const currentYear = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric" }).format(now),
  );
  const age = currentYear - birthYear;

  if (age < 19) return "19세 미만";
  if (age <= 24) return "19~24";
  if (age <= 29) return "25~29";
  if (age <= 34) return "30~34";
  if (age <= 39) return "35~39";
  return "40세 이상";
}
