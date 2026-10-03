// iPhone·iPad는 홈 화면에 추가한 앱에서만 Web Push를 받을 수 있다(iOS 16.4 이상).
// "iOS 기기이면서 홈 화면 앱(standalone)이 아님"을 판정한다. 틀릴 수 있는 한계: 사용자 에이전트를
// 속이는 브라우저, iPadOS의 "데스크톱 사이트 요청"은 Mac으로 보이므로 터치 지점 수로 보충한다.
export type InstallEnv = {
  userAgent: string;
  maxTouchPoints: number;
  /** display-mode: standalone 이거나 navigator.standalone === true */
  standalone: boolean;
};

export function needsHomeScreenInstall({ userAgent, maxTouchPoints, standalone }: InstallEnv): boolean {
  if (standalone) return false;
  const iPhoneOrIPad = /iPhone|iPad|iPod/.test(userAgent);
  const iPadAsMac = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  return iPhoneOrIPad || iPadAsMac;
}

// 브라우저에서 현재 환경을 읽는다(클라이언트 전용).
export function readInstallEnv(): InstallEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
  };
}
