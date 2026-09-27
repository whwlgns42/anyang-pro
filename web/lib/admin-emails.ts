// anyang-backend-api 13-0절 — ADMIN_EMAILS는 매 요청 process.env에서 읽는다(캐싱 없음).
export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
