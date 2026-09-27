import { requireSession } from "../../../_lib/session-guard";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsSettingsPage() {
  await requireSession({ requireProfile: true });
  return <NotificationsClient />;
}
