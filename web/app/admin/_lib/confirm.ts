// anyang-frontend-screens 10절: 정지·정지 해제·삭제 공용 확인 다이얼로그. 모달 라이브러리
// 없이 네이티브 window.confirm으로 충분하다(YAGNI).
export function confirmAction(message: string): boolean {
  return window.confirm(message);
}
