import { requireSession } from "../../_lib/session-guard";
import { NoticesList } from "./notices-list";

export default async function NoticesPage() {
  await requireSession({ requireProfile: true });
  return <NoticesList />;
}
