// anyang-frontend-screens 2-1절 관심사 시트. 시트 본문이 어떤 상태를 그릴지 정한다.
export type InterestStatus = "loading" | "ok" | "error";
export type SheetView = "loading" | "error" | "empty" | "list";

export function sheetView(status: InterestStatus, count: number): SheetView {
  if (status !== "ok") return status;
  return count > 0 ? "list" : "empty";
}
