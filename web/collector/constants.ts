// anyang-board-collector A-4 — 보드 수집기 상수는 이 파일 한 곳에 둔다.
export const LOCK_KEY = 5517043; // 보드 DB 세션 advisory lock(서버 수집기 5517042와 다른 값, DB도 다르다)
export const STALE_RUNNING_MINUTES = 10; // running으로 남은 행을 failed('stale')로
export const BLOCK_REST_MINUTES = 60; // ip_blocked 뒤 사이트를 두드리지 않는 시간
export const BATCH_SIZE = 20; // 받기 API 1회 최대 항목
export const BATCH_BYTE_LIMIT = 3_500_000; // 요청 본문 4MB 한도 아래로 배치를 자른다(최소 1건)
export const MAX_BATCHES_QUICK_FULL = 30; // quick/full 한 실행의 전송 상한(backfill·sync는 무제한)
export const MAX_EMBED_CALLS = 10; // 남은 임베딩 호출 상한
export const SITE_TIMEOUT_MS = 30_000; // 안양시 사이트 요청 시간 초과
export const INGEST_TIMEOUT_MS = 280_000; // 받기 API 요청 시간 초과(함수 한도 300초 안)
export const BACKFILL_LAST_PAGE = 47;
export const RETRY_LIMIT = 5; // 연속 전송 실패 상한(database 문서). 10분 x 2^n 백오프는 store.ts SQL에 있다.
