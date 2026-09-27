import { Pool } from "pg";

// ponytail: 단일 커넥션 풀. Route Handler마다 새로 만들지 않게 전역에 캐싱한다
// (Next.js dev 모드 hot-reload 시 풀이 계속 늘어나는 것을 막는 표준 패턴).
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}
