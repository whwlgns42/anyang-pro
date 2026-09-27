import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;

// anyang-backend-api 13-2절 — 날짜별 발송·실패 수 + 구독 수(둘 다 반환: notify_enabled_count,
// push_device_count). 기본 범위는 최근 30일.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

  const [dailyRes, enabledRes, deviceRes] = await Promise.all([
    pool.query<{ day: Date; result: string; count: string }>(
      `select date_trunc('day', sent_at) as day, result, count(*)
         from notify_logs
        where sent_at >= $1 and sent_at < $2
        group by 1, 2
        order by 1 desc`,
      [from, to],
    ),
    pool.query<{ count: string }>(`select count(*) from notify_settings where enabled = true`),
    pool.query<{ count: string }>(`select count(*) from push_subscriptions`),
  ]);

  const dailyMap = new Map<string, { day: string; success_count: number; failed_count: number }>();
  for (const row of dailyRes.rows) {
    const key = row.day.toISOString();
    const entry = dailyMap.get(key) ?? { day: key, success_count: 0, failed_count: 0 };
    if (row.result === "success") entry.success_count = Number(row.count);
    if (row.result === "failed") entry.failed_count = Number(row.count);
    dailyMap.set(key, entry);
  }

  return NextResponse.json({
    daily: Array.from(dailyMap.values()),
    notify_enabled_count: Number(enabledRes.rows[0]?.count ?? 0),
    push_device_count: Number(deviceRes.rows[0]?.count ?? 0),
  });
}
