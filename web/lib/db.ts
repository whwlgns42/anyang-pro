import { Pool } from "pg";

// ponytail: 단일 커넥션 풀. Route Handler마다 새로 만들지 않게 전역에 캐싱한다
// (Next.js dev 모드 hot-reload 시 풀이 계속 늘어나는 것을 막는 표준 패턴).
const globalForPg = globalThis as unknown as { pgPool?: Pool };

// ponytail: 서버리스는 함수 인스턴스마다 이 풀이 새로 뜬다 — pg 기본 max(10)를 그대로 두면
// 인스턴스 수 × 10만큼 Supabase 커넥션을 잡아먹어 무료 티어 한도를 쉽게 넘긴다. 인스턴스당
// 요청 동시성이 낮은 이 서비스 규모에서는 3이면 충분하다는 추정값. 실제 동시 접속이 늘면
// Supabase 커넥션 풀러(pgbouncer) 도입을 재검토.
const SERVERLESS_POOL_MAX = 3;

export const pool =
  globalForPg.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: SERVERLESS_POOL_MAX });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}
