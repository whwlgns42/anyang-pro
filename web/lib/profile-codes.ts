// anyang-service-scope 확정 코드 식별자(항목 19). 값을 바꾸려면 그 문서를 먼저 갱신한다.
export const GENDERS = ["male", "female", "unspecified"] as const;
export const ENROLLMENT_STATUSES = [
  "student",
  "employed",
  "job_seeking",
  "other",
] as const;
export const OCCUPATION_TYPES = [
  "it",
  "manufacturing",
  "service_sales",
  "office_management",
  "culture_arts",
  "medical_welfare",
  "construction_agriculture",
  "other",
] as const;

export type Gender = (typeof GENDERS)[number];
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
export type OccupationType = (typeof OCCUPATION_TYPES)[number];
