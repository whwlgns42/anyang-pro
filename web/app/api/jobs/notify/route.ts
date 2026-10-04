import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireNotifyJobSecret } from "@/lib/scheduler-auth";
import { sendToUserDevices } from "@/lib/push-send";

// anyang-backend-api 7절 — 알림 잡. 시각 창 매칭 + 코사인 유사도 + notify_logs pending 선점.
const SIMILARITY_THRESHOLD = 0.70; // 확인 항목 57(n) 사용자 결정(2026-10-04, 승인된 설계 29차)으로 0.75에서 변경
// anyang-backend-api 7-1절 — 일괄 발송 방지: 게시일 기준 14일 상한.
const NOTIFY_MAX_AGE_DAYS = 14;
// anyang-backend-api 7-2절(확인 항목 59, 승인된 설계 30차): 직군 임계값·합산 상한.
const OCCUPATION_THRESHOLD = 0.60;
const MAX_MATCHES = 20;

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

// anyang-backend-api 7-2절 — 사용자 직군의 문장 벡터. 직군 null·other·행 없음·테이블 없음(0022 전 배포)이면 null → 현행(선호만).
async function getOccupationVector(userId: string): Promise<string | null> {
  try {
    const { rows } = await pool.query<{ embedding: string }>(
      `select oe.embedding
         from profiles p
         join occupation_embeddings oe on oe.code = p.occupation_type
        where p.user_id = $1`,
      [userId],
    );
    return rows[0]?.embedding ?? null;
  } catch (err) {
    if ((err as { code?: string }).code === "42P01") return null; // undefined_table
    throw err;
  }
}

async function queryNotices(vector: string, enabledAt: Date) {
  const { rows } = await pool.query<{ id: string; similarity: number }>(
    `select n.id, 1 - (nc.embedding <=> $1) as similarity
       from notice_chunks nc
       join notices n on n.id = nc.notice_id
      where n.hidden_at is null
        and n.collected_at > $2
        and coalesce(n.published_at, n.collected_at) >= now() - make_interval(days => $3)
      order by nc.embedding <=> $1
      limit 20`,
    [vector, enabledAt, NOTIFY_MAX_AGE_DAYS],
  );
  return rows;
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
    const occupationVector = await getOccupationVector(userId);
    if (prefRows.length === 0 && !occupationVector) continue; // 선호도 직군 벡터도 없으면 매칭 대상 없음(7-2절)

    // 관심사(0.70)와 직군(0.60)을 각자 임계값으로 거른 합집합. 같은 공지는 높은 유사도, 합산 상한 20건.
    const matched = new Map<string, number>();
    const collect = (rows: { id: string; similarity: number }[], threshold: number) => {
      for (const row of rows) {
        if (row.similarity < threshold) continue;
        const prev = matched.get(row.id);
        if (prev === undefined || row.similarity > prev) matched.set(row.id, row.similarity);
      }
    };
    if (prefRows.length > 0) {
      const avgPref = averageVectors(prefRows.map((r) => JSON.parse(r.embedding) as number[]));
      collect(await queryNotices(JSON.stringify(avgPref), enabledAt), SIMILARITY_THRESHOLD);
    }
    if (occupationVector) collect(await queryNotices(occupationVector, enabledAt), OCCUPATION_THRESHOLD);

    const noticeIds = [...matched.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, MAX_MATCHES)
      .map(([id]) => id);

    for (const noticeId of noticeIds) {
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
