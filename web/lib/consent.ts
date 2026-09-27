// anyang-backend-api 1절 "consents.policy_version 관리 위치" — 코드 상수로 관리한다.
// 처리방침 문구를 바꿀 때 이 값을 함께 올린다.
export const POLICY_VERSION = "2026-09-27";

// anyang-backend-api 1절 — "수집·이용"/"국외 이전" 분리, 둘 다 필수(확정).
export const CONSENT_TYPES = ["collection_use", "overseas_transfer"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];
