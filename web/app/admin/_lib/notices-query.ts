// anyang-frontend-screens 11절 "공지 목록 탭" — GET /api/admin/notices 쿼리 파라미터 매핑.
// 순수 함수로 분리해 URL 생성 로직을 fetch 없이 테스트한다.
export type HiddenFilter = "all" | "visible" | "hidden";

export function noticesQueryString(
  query: { page: number; hiddenFilter: HiddenFilter },
  pageSize: number,
): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("page_size", String(pageSize));
  if (query.hiddenFilter === "visible") params.set("hidden", "false");
  if (query.hiddenFilter === "hidden") params.set("hidden", "true");
  return params.toString();
}
