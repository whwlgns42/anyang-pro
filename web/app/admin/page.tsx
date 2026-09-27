import { redirect } from "next/navigation";

// /admin 자체는 화면이 없다 — 첫 번째 하위 화면으로 보낸다.
export default function AdminIndexPage() {
  redirect("/admin/collect-runs");
}
