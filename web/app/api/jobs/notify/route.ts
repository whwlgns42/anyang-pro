import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireNotifyJobSecret } from "@/lib/scheduler-auth";
import { sendToUserDevices } from "@/lib/push-send";

// anyang-backend-api 7절 — 알림 잡. 시각 창 매칭 + 코사인 유사도 + notify_logs pending 선점.
const SIMILARITY_THRESHOLD = 0.75; // 설계 승인값(2026-09-27 승인으로 확정)
// anyang-backend-api 7-1절 — 일괄 발송 방지: 게시일 기준 14일 상한.
const NOTIFY_MAX_AGE_DAYS = 14;

export const maxDuration = 60;
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

// anyang-backend-api 7절(확인 항목 30) — 다중 기기 발송 판정은 공용 sendToUserDevices(8-1절 공용화).
function sendToAllDevices(userId: string, noticeId: string) {
  return sendToUserDevices(userId, async () => {
    const { rows } = await pool.query<{ title: string }>(`select title from notices where id = $1`, [noticeId]);
    return JSON.stringify({ title: rows[0]?.title ?? "새 공지", notice_id: noticeId });
  });
}

export async function POST(request: Request) {
  const authError = requireNotifyJobSecret(request);
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
          and coalesce(n.published_at, n.collected_at) >= now() - make_interval(days => $3)
        order by nc.embedding <=> $1
        limit 20`,
      [JSON.stringify(avgPref), enabledAt, NOTIFY_MAX_AGE_DAYS],
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

      const { successCount, failedCount, lastError } = await sendToAllDevices(userId, noticeId);
      if (successCount > 0) {
        await pool.query(
          `update notify_logs set result = 'success', sent_at = now(), failed_device_count = $3
           where user_id = $1 and notice_id = $2`,
          [userId, noticeId, failedCount],
        );
        sentCount++;
      } else if (failedCount === 0) {
        // 구독 0개(또는 전부 만료 삭제): failed로 소진하지 않고 선점 행을 지워 구독 후 재대상이 되게 한다(7-1절).
        await pool.query(
          `delete from notify_logs where user_id = $1 and notice_id = $2 and result = 'pending'`,
          [userId, noticeId],
        );
      } else {
        await pool.query(
          `update notify_logs set result = 'failed', sent_at = now(), error_summary = $3, failed_device_count = $4
           where user_id = $1 and notice_id = $2`,
          [userId, noticeId, lastError instanceof Error ? lastError.message.slice(0, 500) : "unknown", failedCount],
        );
      }
    }
  }

  return NextResponse.json({ sent_count: sentCount });
}
