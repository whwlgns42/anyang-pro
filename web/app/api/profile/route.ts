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

function validateProfile(body: ProfileBody | null) {
  if (!body) return null;
  const { birth_year, gender, occupation_type, enrollment_status } = body;

  if (
    typeof birth_year !== "number" ||
    !Number.isInteger(birth_year) ||
    birth_year < 1900 ||
    birth_year > CURRENT_YEAR
  ) {
    return null;
  }
  if (typeof gender !== "string" || !GENDERS.includes(gender as (typeof GENDERS)[number])) {
    return null;
  }
  if (
    typeof occupation_type !== "string" ||
    !OCCUPATION_TYPES.includes(occupation_type as (typeof OCCUPATION_TYPES)[number])
  ) {
    return null;
  }
  if (
    typeof enrollment_status !== "string" ||
    !ENROLLMENT_STATUSES.includes(enrollment_status as (typeof ENROLLMENT_STATUSES)[number])
  ) {
    return null;
  }

  return { birth_year, gender, occupation_type, enrollment_status };
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
