// 요청 시작 후 이 시간이 지나면 새 임베딩 묶음을 시작하지 않는다(함수 maxDuration 300초 기준).
// /api/jobs/collect(백필)와 /api/ingest/notices가 같은 값을 쓴다. user 확정 200초(승인 21차).
export const EMBED_TIME_BUDGET_MS = 200_000;
