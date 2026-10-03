import { NextResponse } from "next/server";

// anyang-board-collector D — Vercel 서버 직접 수집은 클라우드 IP 차단 때문에 기본 꺼짐.
// DIRECT_COLLECT_ENABLED=true일 때만 /api/jobs/collect·관리자 수동 수집이 동작한다. 꺼져 있으면 410.
export function directCollectDisabled(): Response | null {
  if (process.env.DIRECT_COLLECT_ENABLED === "true") return null;
  return NextResponse.json({ error: "DIRECT_COLLECT_DISABLED" }, { status: 410 });
}
