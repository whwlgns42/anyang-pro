import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

// anyang-backend-api 13-3절 — 가입자 수·연령대/직군/재학재직 집계(개인별 행 없음, 원문 비노출).
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const [totalRes, decadeRes, occupationRes, enrollmentRes] = await Promise.all([
    pool.query<{ count: string }>(`select count(*) from users where suspended_at is null`),
    pool.query<{ birth_decade: number; count: string }>(
      `select (birth_year / 10) * 10 as birth_decade, count(*)
         from profiles
        where birth_year is not null
        group by 1
        order by 1`,
    ),
    pool.query<{ occupation_type: string; count: string }>(
      `select occupation_type, count(*)
         from profiles
        where occupation_type is not null
        group by 1`,
    ),
    pool.query<{ enrollment_status: string; count: string }>(
      `select enrollment_status, count(*)
         from profiles
        where enrollment_status is not null
        group by 1`,
    ),
  ]);

  return NextResponse.json({
    total_users: Number(totalRes.rows[0]?.count ?? 0),
    by_birth_decade: decadeRes.rows.map((r) => ({ decade: r.birth_decade, count: Number(r.count) })),
    by_occupation_type: occupationRes.rows.map((r) => ({
      occupation_type: r.occupation_type,
      count: Number(r.count),
    })),
    by_enrollment_status: enrollmentRes.rows.map((r) => ({
      enrollment_status: r.enrollment_status,
      count: Number(r.count),
    })),
  });
}
