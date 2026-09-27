import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";
import { ENROLLMENT_STATUSES, GENDERS, OCCUPATION_TYPES } from "@/lib/profile-codes";

type ProfileBody = {
  birth_year?: unknown;
  gender?: unknown;
  occupation_type?: unknown;
  enrollment_status?: unknown;
};

const CURRENT_YEAR = new Date().getFullYear();

// anyang-database-schema profiles 표(126~133행): 모든 항목 null 허용, 미입력해도 서비스 이용 가능.
// 값이 온 항목만 코드값·범위를 검증하고, null/undefined는 그대로 통과시킨다.
function validateProfile(body: ProfileBody | null) {
  if (!body) return null;
  const { birth_year, gender, occupation_type, enrollment_status } = body;

  if (
    birth_year != null &&
    (typeof birth_year !== "number" ||
      !Number.isInteger(birth_year) ||
      birth_year < 1900 ||
      birth_year > CURRENT_YEAR)
  ) {
    return null;
  }
  if (gender != null && (typeof gender !== "string" || !GENDERS.includes(gender as (typeof GENDERS)[number]))) {
    return null;
  }
  if (
    occupation_type != null &&
    (typeof occupation_type !== "string" ||
      !OCCUPATION_TYPES.includes(occupation_type as (typeof OCCUPATION_TYPES)[number]))
  ) {
    return null;
  }
  if (
    enrollment_status != null &&
    (typeof enrollment_status !== "string" ||
      !ENROLLMENT_STATUSES.includes(enrollment_status as (typeof ENROLLMENT_STATUSES)[number]))
  ) {
    return null;
  }

  return {
    birth_year: birth_year ?? null,
    gender: gender ?? null,
    occupation_type: occupation_type ?? null,
    enrollment_status: enrollment_status ?? null,
  };
}

// anyang-backend-api 2절 — 프로필 4항목 CRUD(본인만).
export async function GET() {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const { rows } = await pool.query(
    `select birth_year, gender, occupation_type, enrollment_status
       from profiles where user_id = $1`,
    [authResult.userId],
  );
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(request: NextRequest) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;

  const body = (await request.json().catch(() => null)) as ProfileBody | null;
  const valid = validateProfile(body);
  if (!valid) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  await pool.query(
    `insert into profiles (user_id, birth_year, gender, occupation_type, enrollment_status)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update set
       birth_year = excluded.birth_year,
       gender = excluded.gender,
       occupation_type = excluded.occupation_type,
       enrollment_status = excluded.enrollment_status,
       updated_at = now()`,
    [authResult.userId, valid.birth_year, valid.gender, valid.occupation_type, valid.enrollment_status],
  );

  return NextResponse.json(valid);
}
