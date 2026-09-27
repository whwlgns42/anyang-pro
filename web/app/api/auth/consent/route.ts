import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";
import { CONSENT_TYPES, POLICY_VERSION } from "@/lib/consent";

type ConsentBody = {
  consents?: Partial<Record<(typeof CONSENT_TYPES)[number], unknown>>;
};

// anyang-backend-api 1절 — Google 신규 가입 동의 + 재동의 겸용 엔드포인트. 스스로는 재동의
// 판정을 건너뛴다(무한 루프 방지, skipConsent: true). 정지 확인은 그대로 적용된다.
export async function POST(request: NextRequest) {
  const authResult = await requireUser({ skipConsent: true });
  if (authResult instanceof Response) return authResult;

  const body = (await request.json().catch(() => null)) as ConsentBody | null;
  const allConsented = CONSENT_TYPES.every((type) => body?.consents?.[type] === true);
  if (!allConsented) {
    return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
  }

  for (const type of CONSENT_TYPES) {
    await pool.query(
      "insert into consents (user_id, consent_type, policy_version) values ($1, $2, $3)",
      [authResult.userId, type, POLICY_VERSION],
    );
  }

  return NextResponse.json({ ok: true });
}
