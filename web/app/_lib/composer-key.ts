// Enter 전송 판정. 한글 등 조합 중 Enter(조합 확정)는 전송하지 않는다.
// keyCode 229는 Safari가 조합 종료 직후 keydown에 isComposing=false로 보내는 경우의 대비.
export function shouldSubmitOnKey(e: {
  key: string;
  shiftKey: boolean;
  nativeEvent: { isComposing: boolean; keyCode: number };
}): boolean {
  return (
    e.key === "Enter" &&
    !e.shiftKey &&
    !e.nativeEvent.isComposing &&
    e.nativeEvent.keyCode !== 229
  );
}
