import { vi } from "vitest";

// ponytail: 실제 DB 없이 pool.query/connect를 목으로 대체하는 최소 헬퍼.
export function makePoolMock() {
  const query = vi.fn();
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const connect = vi.fn().mockResolvedValue(client);
  return { query, connect, client };
}
