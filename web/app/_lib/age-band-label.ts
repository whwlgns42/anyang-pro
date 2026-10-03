// 화면 표시용 나이대("25~29세"). 서버가 AI에 보내는 lib/age-band.ts의 라벨("25~29")과는 별개이며
// 그쪽 값은 바꾸지 않는다. 구간은 같다: 19세 미만 / 19~24 / 25~29 / 30~34 / 35~39 / 40세 이상.
export function ageBandDisplay(birthYear: number | null | undefined, now: Date = new Date()): string | null {
  if (birthYear == null) return null;
  const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric" }).format(now));
  const age = year - birthYear;
  if (age < 19) return "19세 미만";
  if (age >= 40) return "40세 이상";
  if (age <= 24) return "19~24세";
  const low = age <= 29 ? 25 : age <= 34 ? 30 : 35;
  return `${low}~${low + 4}세`;
}
