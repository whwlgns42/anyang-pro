// anyang-backend-api 4절 Gemini 임베딩 클라이언트. 이 1차 묶음의 범위가 아니다
// (dev-tasks 3번, 2차 묶음에서 실제 Gemini 호출·재시도·배치로 연결한다).
// 2-2절(기억) PUT이 동기 재임베딩을 호출하는 지점만 인터페이스로 고정해 둔다.
export type EmbeddingResult = {
  embedding: number[];
  model: string;
};

export async function embedText(_text: string): Promise<EmbeddingResult> {
  // ponytail: 2차 묶음에서 Gemini 클라이언트로 교체. 그 전까지 호출하면 명시적으로 실패한다
  // (임베딩 없이 텍스트만 저장되는 상태를 만들지 않기 위함 — 설계 2-2절 트랜잭션 롤백 요구).
  throw new Error("EMBEDDING_NOT_CONNECTED: Gemini 임베딩 클라이언트는 2차 묶음에서 연결된다");
}
