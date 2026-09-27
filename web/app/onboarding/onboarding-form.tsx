"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../_lib/api-fetch";
import { GENDERS, ENROLLMENT_STATUSES, OCCUPATION_TYPES } from "@/lib/profile-codes";
import {
  GENDER_LABELS,
  ENROLLMENT_STATUS_LABELS,
  OCCUPATION_TYPE_LABELS,
} from "../_lib/profile-labels";

const CURRENT_YEAR = new Date().getFullYear();

// anyang-frontend-screens 2절: 4개 확정 항목. 설계는 null 허용·건너뛰기를 전제했지만,
// 실제 구현된 PUT /api/profile(web/app/api/profile/route.ts validateProfile)은 4개 모두
// 유효한 값을 요구하고 null을 거부한다(400 INVALID_REQUEST) — 설계와 다른 부분이라 건너뛰기
// 버튼은 만들지 않았다(보고에 "backend 조율 필요"로 남김). occupation_type은 8개 선택지라
// 네이티브 select(설계 승인으로 확정), 나머지는 라디오 그룹.
export function OnboardingForm() {
  const router = useRouter();
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<string>("");
  const [occupationType, setOccupationType] = useState<string>("");
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = birthYear && gender && occupationType && enrollmentStatus;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await apiFetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        birth_year: Number(birthYear),
        gender,
        occupation_type: occupationType,
        enrollment_status: enrollmentStatus,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      if (res.status !== 403) {
        setError("저장 중 오류가 발생했습니다. 모든 항목을 올바르게 입력했는지 확인해 주세요.");
      }
      return;
    }
    router.push("/chat");
  }

  return (
    <main className="page page--narrow">
      <h1>내 정보 입력</h1>
      <p className="hint-text">
        내게 맞는 공지를 추천하기 위해 필요한 정보입니다. 모든 항목을 입력해 주세요.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="birth-year">출생연도</label>
          <input
            id="birth-year"
            type="number"
            min={1900}
            max={CURRENT_YEAR}
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
          />
        </div>

        <fieldset>
          <legend>성별</legend>
          {GENDERS.map((code) => (
            <div className="radio-row" key={code}>
              <input
                id={`gender-${code}`}
                type="radio"
                name="gender"
                value={code}
                checked={gender === code}
                onChange={() => setGender(code)}
              />
              <label htmlFor={`gender-${code}`}>{GENDER_LABELS[code]}</label>
            </div>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="occupation-type">직군(업종·직무)</label>
          <select
            id="occupation-type"
            value={occupationType}
            onChange={(e) => setOccupationType(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {OCCUPATION_TYPES.map((code) => (
              <option key={code} value={code}>
                {OCCUPATION_TYPE_LABELS[code]}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend>재학/재직 여부</legend>
          {ENROLLMENT_STATUSES.map((code) => (
            <div className="radio-row" key={code}>
              <input
                id={`enrollment-${code}`}
                type="radio"
                name="enrollment_status"
                value={code}
                checked={enrollmentStatus === code}
                onChange={() => setEnrollmentStatus(code)}
              />
              <label htmlFor={`enrollment-${code}`}>{ENROLLMENT_STATUS_LABELS[code]}</label>
            </div>
          ))}
        </fieldset>

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting || !canSubmit} style={{ width: "100%" }}>
          저장하고 계속하기
        </button>
      </form>
    </main>
  );
}
