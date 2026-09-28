// anyang-frontend-screens 1-1절(확인 항목 29). 비밀번호 길이 검증·에러 메시지 매핑은 순수
// 함수로 분리해 signIn/fetch 없이 테스트한다. 값(8자, 429 코드명)은 backend
// anyang-backend-api 1-6절 계약을 따르고, 문구는 frontend 제안(미확정)이다.

export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_HINT_TEXT = "비밀번호는 8자 이상이어야 합니다.";
export const TOO_MANY_ATTEMPTS_TEXT = "잠시 후 다시 시도해 주세요.";

export function isPasswordTooShort(password: string): boolean {
  return password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
}

export function getRegisterErrorMessage(status: number, errorCode?: string | null): string {
  if (status === 409) return "이미 가입된 이메일입니다.";
  if (status === 429 && errorCode === "TOO_MANY_ATTEMPTS") return TOO_MANY_ATTEMPTS_TEXT;
  if (status === 400 && errorCode === "PASSWORD_TOO_SHORT") return PASSWORD_HINT_TEXT;
  if (status === 403 && errorCode === "ADMIN_EMAIL_RESERVED") {
    return "이 이메일은 비밀번호로 가입할 수 없습니다. Google로 로그인해 주세요.";
  }
  if (status === 403) return "가입할 수 없습니다.";
  return "가입 중 오류가 발생했습니다.";
}

// 429(TOO_MANY_ATTEMPTS)는 계정 열거 방지를 위해 401과 같은 문구를 쓰지 않고 구분한다
// (backend 1-6절 "계정 열거 방지" 원칙, 표시는 error-text가 아닌 banner 클래스로도 구분).
export function isLoginTooManyAttempts(errorCode?: string | null): boolean {
  return errorCode === "TOO_MANY_ATTEMPTS";
}

export const LOGIN_INVALID_TEXT = "이메일 또는 비밀번호가 올바르지 않습니다.";
