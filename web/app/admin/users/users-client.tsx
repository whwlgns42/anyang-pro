"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../_lib/api-fetch";
import { confirmAction } from "../_lib/confirm";
import { OCCUPATION_TYPE_LABELS, ENROLLMENT_STATUS_LABELS } from "../../_lib/profile-labels";

type User = { id: string; email: string; created_at: string; suspended_at: string | null };
type Stats = {
  total_users: number;
  by_birth_decade: { decade: number; count: number }[];
  by_occupation_type: { occupation_type: string; count: number }[];
  by_enrollment_status: { enrollment_status: string; count: number }[];
};

// anyang-frontend-screens 13절: 통계 + 사용자 목록(id/email/created_at/suspended_at만 —
// 대화·기억 원문은 서버 응답에 애초에 없다). 정지/정지 해제/삭제는 확인 다이얼로그를 거친다.
export function UsersClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [statsRes, usersRes] = await Promise.all([
      apiFetch("/api/admin/stats"),
      apiFetch("/api/admin/users"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSuspend(user: User) {
    if (!confirmAction(`${user.email} 계정을 정지하시겠습니까?`)) return;
    const res = await apiFetch(`/api/admin/users/${user.id}/suspend`, { method: "PATCH" });
    if (res.ok) {
      const body = (await res.json()) as { suspended: boolean };
      setUsers(
        (prev) =>
          prev?.map((u) =>
            u.id === user.id ? { ...u, suspended_at: body.suspended ? new Date().toISOString() : null } : u,
          ) ?? null,
      );
    } else if (res.status !== 403) {
      setError("정지 처리 중 오류가 발생했습니다.");
    }
  }

  async function handleUnsuspend(user: User) {
    if (!confirmAction(`${user.email} 계정의 정지를 해제하시겠습니까?`)) return;
    const res = await apiFetch(`/api/admin/users/${user.id}/unsuspend`, { method: "PATCH" });
    if (res.ok) {
      setUsers((prev) => prev?.map((u) => (u.id === user.id ? { ...u, suspended_at: null } : u)) ?? null);
    } else if (res.status !== 403) {
      setError("정지 해제 중 오류가 발생했습니다.");
    }
  }

  async function handleDelete(user: User) {
    if (
      !confirmAction(
        `${user.email} 계정을 삭제하시겠습니까? 동의 기록은 증빙용으로 1년간 보관된 뒤 삭제되고, 나머지 계정 데이터는 즉시 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      )
    )
      return;
    const res = await apiFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.status === 204) {
      setUsers((prev) => prev?.filter((u) => u.id !== user.id) ?? null);
    } else if (res.status !== 403) {
      setError("삭제 중 오류가 발생했습니다.");
    }
  }

  return (
    <main className="page">
      <h1>사용자 관리·통계</h1>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {stats && (
        <div className="card">
          <p>전체 사용자: {stats.total_users}명</p>
          <p className="hint-text">
            연령대:{" "}
            {stats.by_birth_decade.map((d) => `${d.decade}대 ${d.count}명`).join(", ") || "-"}
          </p>
          <p className="hint-text">
            직군:{" "}
            {stats.by_occupation_type
              .map(
                (d) =>
                  `${OCCUPATION_TYPE_LABELS[d.occupation_type as keyof typeof OCCUPATION_TYPE_LABELS] ?? d.occupation_type} ${d.count}명`,
              )
              .join(", ") || "-"}
          </p>
          <p className="hint-text">
            재학/재직:{" "}
            {stats.by_enrollment_status
              .map(
                (d) =>
                  `${ENROLLMENT_STATUS_LABELS[d.enrollment_status as keyof typeof ENROLLMENT_STATUS_LABELS] ?? d.enrollment_status} ${d.count}명`,
              )
              .join(", ") || "-"}
          </p>
        </div>
      )}

      {users === null ? (
        <p className="hint-text">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto"><table>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>이메일</th>
              <th style={{ textAlign: "left" }}>가입일</th>
              <th style={{ textAlign: "left" }}>상태</th>
              <th style={{ textAlign: "left" }}>동작</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>{user.suspended_at ? "정지됨" : "정상"}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    {user.suspended_at ? (
                      <button type="button" className="secondary" onClick={() => handleUnsuspend(user)}>
                        정지 해제
                      </button>
                    ) : (
                      <button type="button" className="secondary" onClick={() => handleSuspend(user)}>
                        정지
                      </button>
                    )}
                    <button type="button" className="danger" onClick={() => handleDelete(user)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </main>
  );
}
