import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";

// anyang-backend-api 8절 — Web Push 구독 저장/해지.
export async function POST(request: NextRequest) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const body = (await request.json().catch(() => null)) as
    | { endpoint?: unknown; p256dh?: unknown; auth?: unknown }
    | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.p256dh === "string" ? body.p256dh : "";
  const authKey = typeof body?.auth === "string" ? body.auth : "";
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  await pool.query(
    `insert into push_subscriptions (user_id, endpoint, p256dh, auth)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update
       set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [authResult.userId, endpoint, p256dh, authKey],
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  await pool.query(`delete from push_subscriptions where endpoint = $1 and user_id = $2`, [
    endpoint,
    authResult.userId,
  ]);

  return new NextResponse(null, { status: 204 });
}
