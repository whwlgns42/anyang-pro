import { NextResponse } from "next/server";
import { requireSchedulerSecret } from "@/lib/scheduler-auth";
import { runEmbedJob, splitIntoChunks } from "@/lib/embed-job";

// anyang-backend-api 6·7절 — 임베딩 파이프라인 잡. 본체는 @/lib/embed-job(수집 잡도 함께 호출).
export { splitIntoChunks };

export async function POST(request: Request) {
  const authError = requireSchedulerSecret(request);
  if (authError) return authError;

  const result = await runEmbedJob();
  return NextResponse.json(result);
}
