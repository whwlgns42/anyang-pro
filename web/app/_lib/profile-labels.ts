// anyang-service-scope "프로필 선택지" 행(user, 2026-09-27)의 한국어 표시명.
// 코드값 자체는 @/lib/profile-codes(backend 소유)를 그대로 쓰고, 여기서는 표시 문구만 붙인다.
import { GENDERS, ENROLLMENT_STATUSES, OCCUPATION_TYPES } from "@/lib/profile-codes";

export const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
  male: "남성",
  female: "여성",
  unspecified: "밝히지 않음",
};

export const ENROLLMENT_STATUS_LABELS: Record<(typeof ENROLLMENT_STATUSES)[number], string> = {
  student: "학생",
  employed: "재직",
  job_seeking: "구직·미취업",
  other: "기타",
};

export const OCCUPATION_TYPE_LABELS: Record<(typeof OCCUPATION_TYPES)[number], string> = {
  it: "IT·개발",
  manufacturing: "제조·생산",
  service_sales: "서비스·판매",
  office_management: "사무·경영",
  culture_arts: "문화·예술",
  medical_welfare: "의료·복지",
  construction_agriculture: "건설·농업 등",
  other: "기타",
};
