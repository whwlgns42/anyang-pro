import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

type NotifySettingsBody = {
  notify_time?: unknown;
  enabled?: unknown;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// anyang-backend-api 2-2절 — 알림 설정. PUT은 enabled_at 갱신 규칙(신규 생성 시 채움,
// false→true 전환 시 갱신, 그 외 건드리지 않음)을 지킨다.
export async function GET() {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const { rows } = await pool.query(
    `select notify_time, enabled from notify_settings where user_id = $1`,
    [authResult.userId],
  );
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(request: NextRequest) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const body = (await request.json().catch(() => null)) as NotifySettingsBody | null;
  const notifyTime = typeof body?.notify_time === "string" ? body.notify_time : "";
  const enabled = typeof body?.enabled === "boolean" ? body.enabled : null;

  if (!TIME_RE.test(notifyTime) || enabled === null) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const { rows } = await pool.query<{ enabled: boolean }>(
    `select enabled from notify_settings where user_id = $1`,
    [authResult.userId],
  );
  const existing = rows[0];
  const shouldStampEnabledAt = !existing || (!existing.enabled && enabled);

  await pool.query(
    `insert into notify_settings (user_id, notify_time, enabled, enabled_at)
     values ($1, $2, $3, case when $4 then now() else null end)
     on conflict (user_id) do update set
       notify_time = excluded.notify_time,
       enabled = excluded.enabled,
       enabled_at = case when $4 then now() else notify_settings.enabled_at end,
       updated_at = now()`,
    [authResult.userId, notifyTime, enabled, shouldStampEnabledAt],
  );

  return NextResponse.json({ notify_time: notifyTime, enabled });
}
