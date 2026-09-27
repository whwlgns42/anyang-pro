import { pool } from "./db";

// anyang-backend-api 3절 "api_usage_logs 기록 지점" — DeepSeek·Gemini 호출을 감싸는 공통
// 래퍼. 성공·실패와 무관하게 호출 직후 1행을 기록한다(user_id 없음, 설계 그대로).
export type ApiProvider = "deepseek" | "gemini";
export type ApiOperation = "chat" | "embedding";
type ApiStatus = "success" | "rate_limited" | "error";

// provider가 HTTP 상태 코드를 포함해 던지는 공통 오류. 429 → rate_limited, 그 외 실패 → error.
export class ApiCallError extends Error {
  readonly httpStatus?: number;
  constructor(message: string, httpStatus?: number) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

async function recordUsage(
  provider: ApiProvider,
  operation: ApiOperation,
  status: ApiStatus,
  inputTokens: number | null,
  outputTokens: number | null,
): Promise<void> {
  await pool.query(
    `insert into api_usage_logs (provider, operation, status, input_tokens, output_tokens)
     values ($1, $2, $3, $4, $5)`,
    [provider, operation, status, inputTokens, outputTokens],
  );
}

export async function withApiUsageLog<T>(
  provider: ApiProvider,
  operation: ApiOperation,
  fn: () => Promise<{ value: T; inputTokens?: number | null; outputTokens?: number | null }>,
): Promise<T> {
  try {
    const { value, inputTokens = null, outputTokens = null } = await fn();
    await recordUsage(provider, operation, "success", inputTokens, outputTokens);
    return value;
  } catch (err) {
    const status: ApiStatus =
      err instanceof ApiCallError && err.httpStatus === 429 ? "rate_limited" : "error";
    await recordUsage(provider, operation, status, null, null);
    throw err;
  }
}
