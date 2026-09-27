import { requireSession } from "../../../_lib/session-guard";
import { NoticeDetail } from "./notice-detail";

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession({ requireProfile: true });
  const { id } = await params;
  return <NoticeDetail id={id} />;
}
