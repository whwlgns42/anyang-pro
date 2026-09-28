import type { ReactNode } from "react";

// anyang-frontend-screens 33절(시각 개선, 확인 항목 25): 인증 계열 화면(로그인/가입,
// consent, onboarding, suspended) 공통 카드 레이아웃. 화면 흐름·API·폼 필드는 바꾸지 않고
// 배치만 통일한다. 서버·클라이언트 컴포넌트 양쪽에서 쓰므로 훅 없이 순수하게 구성한다.
function AuthLogo() {
  return (
    <div className="auth-logo">
      <span className="auth-logo__mark" aria-hidden="true">
        안
      </span>
      <span className="auth-logo__text">안양 청년정책 비서</span>
    </div>
  );
}

function AuthFooter() {
  return (
    <footer className="auth-footer">
      <a href="/privacy-policy">개인정보 처리방침</a>
    </footer>
  );
}

/** consent · onboarding · suspended: 로고 + 단일 카드, 중앙 정렬. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-main">
        <div className="auth-card">
          <AuthLogo />
          {children}
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}

/** 로그인/가입: 데스크톱 2단(왼쪽 소개 + 핵심 가치, 오른쪽 카드), 모바일은 로고만 위에 쌓고 카드로. */
export function AuthLayoutSplit({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-main">
        <div className="auth-grid">
          <div className="auth-brand">
            <AuthLogo />
            <h1 className="auth-tagline">안양 청년을 위한 맞춤 정책 알림 비서</h1>
            <ul className="auth-values">
              <li>맞춤 추천. 내 조건에 맞는 정책만 골라 보여줍니다.</li>
              <li>매일 알림. 마감이 다가오는 공고를 놓치지 않게 알려줍니다.</li>
              <li>AI 상담. 궁금한 점을 바로 물어보고 답을 받습니다.</li>
            </ul>
          </div>
          <div className="auth-card">{children}</div>
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}
