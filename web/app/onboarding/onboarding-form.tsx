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

// anyang-frontend-screens 2절: 4개 확정 항목, 모두 선택 입력(database 설계 원칙 — backend
// b0085a4에서 PUT /api/profile이 4항목 모두 null을 허용하도록 고쳐졌다). 각 항목에
// "선택 안 함" 값을 둬 비워도 제출할 수 있고, "나중에 입력" 버튼은 모든 항목을 null로
// 제출한다. occupation_type은 8개 선택지라 네이티브 select(설계 승인으로 확정),
// 나머지는 라디오 그룹.
export function OnboardingForm() {
  const router = useRouter();
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<string>("");
  const [occupationType, setOccupationType] = useState<string>("");
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitProfile(body: {
    birth_year: number | null;
    gender: string | null;
    occupation_type: string | null;
    enrollment_status: string | null;
  }) {
    setSubmitting(true);
    setError(null);
    const res = await apiFetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      if (res.status !== 403) {
        setError("저장 중 오류가 발생했습니다. 입력한 항목을 확인해 주세요.");
      }
      return;
    }
    router.push("/chat");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitProfile({
      birth_year: birthYear ? Number(birthYear) : null,
      gender: gender || null,
      occupation_type: occupationType || null,
      enrollment_status: enrollmentStatus || null,
    });
  }

  function handleSkip() {
    submitProfile({
      birth_year: null,
      gender: null,
      occupation_type: null,
      enrollment_status: null,
    });
  }

  return (
    <main className="page page--narrow">
      <h1>내 정보 입력</h1>
      <p className="hint-text">
        내게 맞는 공지를 추천하기 위해 필요한 정보입니다. 모든 항목은 선택 입력이며, 나중에
        다시 입력할 수 있습니다.
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
          <div className="radio-row">
            <input
              id="gender-none"
              type="radio"
              name="gender"
              value=""
              checked={gender === ""}
              onChange={() => setGender("")}
            />
            <label htmlFor="gender-none">선택 안 함</label>
          </div>
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
          <div className="radio-row">
            <input
              id="enrollment-none"
              type="radio"
              name="enrollment_status"
              value=""
              checked={enrollmentStatus === ""}
              onChange={() => setEnrollmentStatus("")}
            />
            <label htmlFor="enrollment-none">선택 안 함</label>
          </div>
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

        <button type="submit" disabled={submitting} style={{ width: "100%" }}>
          저장하고 계속하기
        </button>
        <button
          type="button"
          className="secondary"
          onClick={handleSkip}
          disabled={submitting}
          style={{ width: "100%", marginTop: 8 }}
        >
          나중에 입력
        </button>
      </form>
    </main>
  );
}
