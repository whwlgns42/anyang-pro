import { ApiCallError, withApiUsageLog } from "./api-usage-log";

// anyang-backend-api 4절 Gemini 임베딩 클라이언트 + 재시도·배치(dev-tasks 3번).
export type EmbeddingResult = {
  embedding: number[];
  model: string;
};

const GEMINI_MODEL = "gemini-embedding-001";
const OUTPUT_DIMENSIONALITY = 768;
const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];
// 무료 티어 RPM 100 한도 안 여유(설계 제안 10~20건).
export const EMBED_BATCH_SIZE = 15;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(text: string): Promise<{ embedding: number[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: OUTPUT_DIMENSIONALITY,
      }),
    },
  );

  if (!res.ok) {
    throw new ApiCallError(`gemini embed failed: ${res.status}`, res.status);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const embedding = data.embedding?.values;
  if (!Array.isArray(embedding)) {
    throw new Error("gemini embed: response missing embedding.values");
  }
  return { embedding };
}

// 429/5xx만 재시도(anyang-backend-api 4절, 지수 백오프 1s/2s/4s 최대 3회). 그 외 오류는 즉시 전파.
async function callGeminiWithRetry(text: string): Promise<{ embedding: number[] }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGemini(text);
    } catch (err) {
      lastError = err;
      const status = err instanceof ApiCallError ? err.httpStatus : undefined;
      const retryable = status === 429 || (typeof status === "number" && status >= 500);
      if (!retryable || attempt === MAX_RETRIES) throw err;
      await sleep(BACKOFF_MS[attempt]);
    }
  }
  throw lastError;
}

export async function embedText(text: string): Promise<EmbeddingResult> {
  const embedding = await withApiUsageLog("gemini", "embedding", async () => {
    const result = await callGeminiWithRetry(text);
    return { value: result.embedding };
  });
  return { embedding, model: GEMINI_MODEL };
}

// ponytail: Gemini embedContent는 텍스트 1건씩만 받는 API라 "배치"는 순차 호출로 표현한다.
// RPM 100 한도 안에서는 동시성 제어가 따로 필요 없다 — 트래픽이 커지면 큐잉 도입 검토.
export async function embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}
