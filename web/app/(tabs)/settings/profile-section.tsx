"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { browserStorage, clearAllChatSnapshots } from "../../_lib/chat-snapshot";
import { apiFetch } from "../../_lib/api-fetch";
import { ageBandDisplay } from "../../_lib/age-band-label";
import { ENROLLMENT_STATUS_LABELS, GENDER_LABELS, OCCUPATION_TYPE_LABELS } from "../../_lib/profile-labels";
import { Icon } from "../../_components/ui/icon";

type Profile = {
  birth_year: number | null;
  gender: string | null;
  occupation_type: string | null;
  enrollment_status: string | null;
} | null;

function label<T extends Record<string, string>>(map: T, value: string | null): string {
  return value && value in map ? map[value] : "-";
}

// 프로필 구역(읽기 전용). "수정" 버튼은 만들지 않는다(프로필 수정은 기존 설계에 없는 기능).
export function ProfileSection() {
  const [profile, setProfile] = useState<Profile | undefined>(undefined);

  useEffect(() => {
    apiFetch("/api/profile").then(async (res) => {
      if (res.ok) setProfile(await res.json());
    });
  }, []);

  const age = ageBandDisplay(profile?.birth_year);
  const rows: [string, string][] = [
    ["출생연도", profile?.birth_year ? `${profile.birth_year}년` : "-"],
    ["성별", label(GENDER_LABELS, profile?.gender ?? null)],
    ["직군", label(OCCUPATION_TYPE_LABELS, profile?.occupation_type ?? null)],
    ["재학·재직", label(ENROLLMENT_STATUS_LABELS, profile?.enrollment_status ?? null)],
  ];

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 text-title">프로필</h2>
      <dl className="m-0 divide-y divide-rule rounded-control border border-rule bg-surface">
        {rows.map(([name, value]) => (
          <div key={name} className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 px-4 py-[11px] text-body">
            <dt className="text-ink-2">{name}</dt>
            <dd className="m-0">{profile === undefined ? "" : value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-meta text-ink-3">AI에는 출생연도 대신 나이대{age ? `(${age})` : ""}를 보내요.</p>
    </section>
  );
}

const rowClass = "flex min-h-12 w-full items-center justify-between border-0 border-b border-rule text-ink no-underline";

// 링크 목록: 대화 기록, 처리방침, 로그아웃, 탈퇴.
export function AccountLinks() {
  const router = useRouter();

  async function handleLogout() {
    await signOut({ redirect: false });
    clearAllChatSnapshots(browserStorage());
    router.push("/login");
  }

  return (
    <div className="flex flex-col border-t border-rule text-body">
      <Link href="/conversations" className={rowClass}>
        대화 기록
        <Icon name="chevron-right" size={16} className="text-ink-3" />
      </Link>
      <Link href="/privacy-policy" className={rowClass}>
        개인정보 처리방침
        <Icon name="chevron-right" size={16} className="text-ink-3" />
      </Link>
      <button type="button" onClick={handleLogout} className={`${rowClass} rounded-none bg-transparent p-0 text-left font-normal`}>
        로그아웃
      </button>
      <Link href="/settings/account" className="flex min-h-12 items-center text-danger no-underline">
        탈퇴하기
      </Link>
    </div>
  );
}
