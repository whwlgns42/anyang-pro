import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

// anyang-backend-api 13-4절 — 제공자별 호출 수·오류·토큰, 무료 한도 대비 사용량. Gemini만
// RPD 한도가 있어 limit_note를 계산한다("사용량/1000"). DeepSeek는 동시성 제한이라 한도
// 대비 비율을 만들지 않는다(null, 11절 출처 링크).
const GEMINI_FREE_TIER_RPD = 1000;

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(new Date().toDateString());
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  const { rows } = await pool.query<{
    provider: string;
    day: Date;
    success_count: string;
    rate_limited_count: string;
    error_count: string;
    input_tokens: string | null;
    output_tokens: string | null;
  }>(
    `select provider, date_trunc('day', requested_at) as day,
            count(*) filter (where status = 'success') as success_count,
            count(*) filter (where status = 'rate_limited') as rate_limited_count,
            count(*) filter (where status = 'error') as error_count,
            sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens
       from api_usage_logs
      where requested_at >= $1 and requested_at < $2
      group by 1, 2
      order by 1, 2`,
    [from, to],
  );

  const providers = rows.map((row) => {
    const successCount = Number(row.success_count);
    const limitNote = row.provider === "gemini" ? `${successCount}/${GEMINI_FREE_TIER_RPD}` : null;
    return {
      provider: row.provider,
      day: row.day.toISOString(),
      success_count: successCount,
      rate_limited_count: Number(row.rate_limited_count),
      error_count: Number(row.error_count),
      input_tokens: row.input_tokens != null ? Number(row.input_tokens) : null,
      output_tokens: row.output_tokens != null ? Number(row.output_tokens) : null,
      limit_note: limitNote,
    };
  });

  return NextResponse.json({ providers });
}
