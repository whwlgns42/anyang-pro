import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { CONSENT_TYPES, POLICY_VERSION } from "@/lib/consent";
import { isAdminEmail } from "@/lib/admin-emails";

type RegisterBody = {
  email?: unknown;
  password?: unknown;
  consents?: Partial<Record<(typeof CONSENT_TYPES)[number], unknown>>;
};

// anyang-backend-api 1절 — 회원가입: 동의 2항목 모두 true여야 하고, ADMIN_EMAILS면 가입 자체를 막는다.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  if (isAdminEmail(email)) {
    return NextResponse.json({ error: "ADMIN_EMAIL_RESERVED" }, { status: 403 });
  }

  const allConsented = CONSENT_TYPES.every((type) => body?.consents?.[type] === true);
  if (!allConsented) {
    return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const existing = await client.query("select id from users where email = $1", [email]);
    if (existing.rows.length > 0) {
      await client.query("rollback");
      return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await client.query<{ id: string }>(
      "insert into users (email) values ($1) returning id",
      [email],
    );
    const userId = rows[0].id;

    await client.query("insert into credentials (user_id, password_hash) values ($1, $2)", [
      userId,
      passwordHash,
    ]);

    for (const type of CONSENT_TYPES) {
      await client.query(
        "insert into consents (user_id, consent_type, policy_version) values ($1, $2, $3)",
        [userId, type, POLICY_VERSION],
      );
    }

    await client.query("commit");
    return NextResponse.json({ id: userId, email }, { status: 201 });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
