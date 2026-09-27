// anyang-backend-api 3절 0번 — 전화번호·이메일·주민등록번호 형태를 정규식으로 가린다.
// Gemini·DeepSeek 전송 직전 두 지점 모두 이 공용 함수 하나만 거친다(같은 정규식을 두 곳에
// 복제하지 않는다).
const PHONE_RE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const RRN_RE = /\d{6}[-\s]?[1-4]\d{6}/g;

export function maskPii(text: string): string {
  return text.replace(PHONE_RE, "[전화번호]").replace(EMAIL_RE, "[이메일]").replace(RRN_RE, "[주민등록번호]");
}
