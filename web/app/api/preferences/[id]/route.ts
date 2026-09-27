import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-auth";
import { embedText } from "@/lib/embeddings";

type Params = { params: Promise<{ id: string }> };

// anyang-backend-api 2-3절 — 항목 1건 수정(동기 재임베딩, 실패 시 롤백)·삭제.
export async function PUT(request: NextRequest, { params }: Params) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { preference_text?: unknown } | null;
  const preferenceText = typeof body?.preference_text === "string" ? body.preference_text : "";
  if (!preferenceText) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const owned = await pool.query(
    `select id from user_preferences where id = $1 and user_id = $2`,
    [id, authResult.userId],
  );
  if (owned.rows.length === 0) {
    return NextResponse.json(null, { status: 404 });
  }

  // 재임베딩 실패(2차 묶음 연결 전에는 항상 실패) 시 텍스트도 갱신하지 않는다 — 설계 요구.
  let embedding;
  try {
    embedding = await embedText(preferenceText);
  } catch {
    return NextResponse.json({ error: "EMBEDDING_FAILED" }, { status: 502 });
  }

  await pool.query(
    `update user_preferences
        set preference_text = $3,
            embedding = $4,
            embedding_model = $5,
            updated_at = now()
      where id = $1 and user_id = $2`,
    [id, authResult.userId, preferenceText, JSON.stringify(embedding.embedding), embedding.model],
  );

  return NextResponse.json({ id, preference_text: preferenceText });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const authResult = await requireUser();
  if (authResult instanceof Response) return authResult;
  const { id } = await params;

  await pool.query(`delete from user_preferences where id = $1 and user_id = $2`, [
    id,
    authResult.userId,
  ]);

  return new NextResponse(null, { status: 204 });
}
