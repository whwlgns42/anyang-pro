import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-auth";
import { deleteUserAccount } from "@/lib/delete-account";

// anyang-backend-api 1-3절 — 탈퇴. 삭제 순서는 lib/delete-account.ts 공용 함수(13-3절 관리자
// 삭제와 공유)를 따른다. 정지·재동의 여부와 무관하게 항상 허용한다(skipSuspended, skipConsent).
export async function DELETE() {
  const authResult = await requireUser({ skipSuspended: true, skipConsent: true });
  if (authResult instanceof Response) return authResult;

  await deleteUserAccount(authResult.userId);
  return new NextResponse(null, { status: 204 });
}
