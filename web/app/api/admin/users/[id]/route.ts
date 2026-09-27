import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { deleteUserAccount } from "@/lib/delete-account";

type Params = { params: Promise<{ id: string }> };

// anyang-backend-api 13-3절 — 관리자 대신 삭제. 1-3절과 같은 순서(lib/delete-account.ts 공용 함수).
export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;

  await deleteUserAccount(id);
  return new NextResponse(null, { status: 204 });
}
