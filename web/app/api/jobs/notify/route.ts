import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireSchedulerSecret } from "@/lib/scheduler-auth";
import { sendPushNotification, isGoneSubscriptionError } from "@/lib/web-push";

// anyang-backend-api 7절 — 알림 잡. 시각 창 매칭 + 코사인 유사도 + notify_logs pending 선점.
const SIMILARITY_THRESHOLD = 0.75; // 설계 제안값(미확정)
const PENDING_RETRY_MINUTES = 10;

// anyang-database-schema "pg_cron / pg_net 잡 정의" 절의 대상 사용자 선정 SQL 그대로(자정
// 경계 포함). 값을 옮겨 적었으므로 그 문서가 바뀌면 이 쿼리도 함께 갱신해야 한다.
const CANDIDATE_USERS_SQL = `
  select ns.user_id
    from notify_settings ns
    join users u on u.id = ns.user_id
   where ns.enabled = true
     and u.suspended_at is null
     and (
       (
         (ns.notify_time + interval '5 minutes')::time > ns.notify_time
         and (now() at time zone ns.timezone)::time > ns.notify_time
         and (now() at time zone ns.timezone)::time <= (ns.notify_time + interval '5 minutes')::time
       )
       or
       (
         (ns.notify_time + interval '5 minutes')::time <= ns.notify_time
         and (
           (now() at time zone ns.timezone)::time > ns.notify_time
           or (now() at time zone ns.timezone)::time <= (ns.notify_time + interval '5 minutes')::time
         )
       )
     )
`;

function averageVectors(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0) as number[];
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  return sum.map((s) => s / vectors.length);
}

async function tryReserve(userId: string, noticeId: string): Promise<boolean> {
  const inserted = await pool.query(
    `insert into notify_logs (user_id, notice_id, result) values ($1, $2, 'pending')
     on conflict (user_id, notice_id) do nothing`,
    [userId, noticeId],
  );
  if ((inserted.rowCount ?? 0) > 0) return true;

  // 정체된 pending 재선점(anyang-backend-api 7절, 트리거 주기 5분의 2배 = 10분).
  const reclaimed = await pool.query(
    `update notify_logs set reserved_at = now()
      where user_id = $1 and notice_id = $2 and result = 'pending'
        and reserved_at < now() - make_interval(mins => $3)`,
    [userId, noticeId, PENDING_RETRY_MINUTES],
  );
  return (reclaimed.rowCount ?? 0) > 0;
}

async function sendToAllDevices(userId: string, noticeId: string): Promise<void> {
  const { rows: devices } = await pool.query<{ endpoint: string; p256dh: string; auth: string }>(
    `select endpoint, p256dh, auth from push_subscriptions where user_id = $1`,
    [userId],
  );
  if (devices.length === 0) {
    throw new Error("no push devices registered");
  }
  const { rows: noticeRows } = await pool.query<{ title: string }>(`select title from notices where id = $1`, [
    noticeId,
  ]);
  const payload = JSON.stringify({ title: noticeRows[0]?.title ?? "새 공지", notice_id: noticeId });

  // 기기 1대 실패로 나머지 기기 전송 시도가 막히지 않게 모든 기기를 끝까지 시도한다. 410/404
  // (Gone/Not Found)는 표준 Web Push 처리로 구독을 지우고 "실패"로 세지 않는다 — 그 외 오류는
  // 기존과 동일하게 이 (사용자, 공지) 쌍을 실패로 표시한다(전체 성공해야 성공, 기존 판정 유지).
  let lastError: unknown;
  let goneCount = 0;
  for (const device of devices) {
    try {
      await sendPushNotification(device, payload);
    } catch (err) {
      if (isGoneSubscriptionError(err)) {
        await pool.query(`delete from push_subscriptions where endpoint = $1`, [device.endpoint]);
        goneCount++;
        continue;
      }
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  if (goneCount === devices.length) throw new Error("all push subscriptions were gone");
}

export async function POST(request: Request) {
  const authError = requireSchedulerSecret(request);
  if (authError) return authError;

  const { rows: candidates } = await pool.query<{ user_id: string }>(CANDIDATE_USERS_SQL);

  let sentCount = 0;
  for (const { user_id: userId } of candidates) {
    const { rows: settingsRows } = await pool.query<{ enabled_at: Date | null }>(
      `select enabled_at from notify_settings where user_id = $1`,
      [userId],
    );
    const enabledAt = settingsRows[0]?.enabled_at;
    if (!enabledAt) continue; // enabled_at null(레거시)은 발송 대상 제외(설계 확정)

    const { rows: prefRows } = await pool.query<{ embedding: string }>(
      `select embedding from user_preferences where user_id = $1 order by updated_at desc limit 5`,
      [userId],
    );
    if (prefRows.length === 0) continue; // 선호 없으면 매칭 대상 없음(설계 확정)

    const avgPref = averageVectors(prefRows.map((r) => JSON.parse(r.embedding) as number[]));

    const { rows: noticeRows } = await pool.query<{ id: string; similarity: number }>(
      `select n.id, 1 - (nc.embedding <=> $1) as similarity
         from notice_chunks nc
         join notices n on n.id = nc.notice_id
        where n.hidden_at is null
          and n.collected_at > $2
        order by nc.embedding <=> $1
        limit 20`,
      [JSON.stringify(avgPref), enabledAt],
    );

    const matched = new Map<string, number>();
    for (const row of noticeRows) {
      if (row.similarity >= SIMILARITY_THRESHOLD) {
        const prev = matched.get(row.id);
        if (prev === undefined || row.similarity > prev) matched.set(row.id, row.similarity);
      }
    }

    for (const noticeId of matched.keys()) {
      const reserved = await tryReserve(userId, noticeId);
      if (!reserved) continue;

      try {
        await sendToAllDevices(userId, noticeId);
        await pool.query(
          `update notify_logs set result = 'success', sent_at = now() where user_id = $1 and notice_id = $2`,
          [userId, noticeId],
        );
        sentCount++;
      } catch (err) {
        await pool.query(
          `update notify_logs set result = 'failed', sent_at = now(), error_summary = $3
           where user_id = $1 and notice_id = $2`,
          [userId, noticeId, err instanceof Error ? err.message.slice(0, 500) : "unknown"],
        );
      }
    }
  }

  return NextResponse.json({ sent_count: sentCount });
}
