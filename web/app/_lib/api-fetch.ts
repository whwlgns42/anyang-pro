// frontend 공통 인증 가드(anyang-frontend-screens 공통 레이아웃 절 "403 응답 분기").
// 인증 필요 API가 403을 반환하면 body의 error 코드로 이동할 경로를 정한다.
export type ApiErrorAction =
  | { type: "redirect"; path: string }
  | { type: "none" };

// 순수 함수로 분리해 테스트한다(브라우저 API 없이 분기 로직만 검증).
export function classifyErrorResponse(status: number, errorCode: unknown): ApiErrorAction {
  if (status !== 403) return { type: "none" };
  switch (errorCode) {
    case "ACCOUNT_SUSPENDED":
      return { type: "redirect", path: "/suspended" };
    case "CONSENT_REQUIRED":
      return { type: "redirect", path: "/consent" };
    case "ADMIN_ONLY":
      return { type: "redirect", path: "/chat" };
    default:
      return { type: "none" };
  }
}

// 인증 필요 API 호출에 쓰는 공통 fetch. 403 + 알려진 에러 코드면 해당 화면으로 이동시킨다.
// ADMIN_EMAIL_RESERVED는 가입 화면이 인라인으로 직접 처리하므로 여기서 다루지 않는다.
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 403) {
    const body = await res
      .clone()
      .json()
      .catch(() => null);
    const action = classifyErrorResponse(res.status, body?.error);
    if (action.type === "redirect" && typeof window !== "undefined") {
      window.location.href = action.path;
    }
  }
  return res;
}
