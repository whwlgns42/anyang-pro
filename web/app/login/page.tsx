"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CONSENT_TYPES } from "@/lib/consent";
import {
  PASSWORD_HINT_TEXT,
  TOO_MANY_ATTEMPTS_TEXT,
  LOGIN_INVALID_TEXT,
  getRegisterErrorMessage,
  isLoginTooManyAttempts,
  isPasswordTooShort,
} from "../_lib/auth-form";
import { AuthLayoutSplit } from "../_lib/auth-layout";
import { GoogleIcon } from "../_lib/google-icon";

type Mode = "login" | "register";

// anyang-frontend-screens 1절. 비밀번호 재설정 화면은 1차 출시 제외(확정) — 안내 문구로 대체.
// 가입 동의 체크박스는 같은 화면 안에 두는 방식을 택했다(설계 1절의 두 제안 중 하나, 별도
// /consent 라우팅 왕복 없이 회원가입 요청 하나로 처리하기 위함).
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [collectionUse, setCollectionUse] = useState(false);
  const [overseasTransfer, setOverseasTransfer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordTooShort = isPasswordTooShort(password);
  const canSubmitRegister =
    email &&
    password &&
    password.length >= 8 &&
    password === passwordConfirm &&
    collectionUse &&
    overseasTransfer;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBlocked(null);
    setSubmitting(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);
    if (res?.error) {
      // anyang-backend-api 1-6절 — TOO_MANY_ATTEMPTS는 계정 열거 방지를 위해 401(비밀번호
      // 오류) 메시지와 시각적으로 구분한다(banner vs error-text).
      if (isLoginTooManyAttempts(res.code) || isLoginTooManyAttempts(res.error)) {
        setBlocked("TOO_MANY_ATTEMPTS");
      } else {
        setError(LOGIN_INVALID_TEXT);
      }
      return;
    }
    router.push("/post-login");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBlocked(null);
    if (!canSubmitRegister) return;
    setSubmitting(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        consents: { collection_use: collectionUse, overseas_transfer: overseasTransfer },
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitting(false);
      if (res.status === 429 && body?.error === "TOO_MANY_ATTEMPTS") {
        setBlocked("TOO_MANY_ATTEMPTS");
      } else {
        setError(getRegisterErrorMessage(res.status, body?.error));
      }
      return;
    }
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);
    if (signInRes?.error) {
      setError("가입은 완료됐지만 로그인에 실패했습니다. 다시 로그인해 주세요.");
      setMode("login");
      return;
    }
    router.push("/onboarding");
  }

  async function handleGoogle() {
    const res = await signIn("google", { redirect: false, callbackUrl: "/post-login" });
    if (res?.error === "OAuthAccountNotLinked") {
      setError(
        "이 이메일은 이미 비밀번호로 가입되어 있습니다. 비밀번호로 로그인하거나, 본인 계정이 아니면 관리자에게 문의해 주세요.",
      );
      return;
    }
    if (res?.url) {
      router.push(res.url);
    }
  }

  return (
    <AuthLayoutSplit>
      <button type="button" onClick={handleGoogle} className="btn-google btn-block secondary">
        <GoogleIcon />
        Google로 계속하기
      </button>

      <div className="auth-divider" role="presentation">
        <span>또는</span>
      </div>

      <div role="tablist" aria-label="로그인 또는 가입 선택" className="tab-row">
        <button
          type="button"
          className={mode === "login" ? "" : "secondary"}
          onClick={() => setMode("login")}
          aria-pressed={mode === "login"}
        >
          로그인
        </button>
        <button
          type="button"
          className={mode === "register" ? "" : "secondary"}
          onClick={() => setMode("register")}
          aria-pressed={mode === "register"}
        >
          가입
        </button>
      </div>

      <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {mode === "login" && (
          <p className="hint-text">비밀번호를 잊었다면 Google로 로그인해 주세요.</p>
        )}

        {mode === "register" && (
          <>
            {/* anyang-frontend-screens 1-1절 — 비밀번호 힌트는 상시 노출, 8자 미만이면
                제출 전 인라인 오류로도 표시(서버 400 PASSWORD_TOO_SHORT와 같은 자리). */}
            <p className="hint-text">{PASSWORD_HINT_TEXT}</p>
            {passwordTooShort && (
              <p className="error-text" role="alert">
                {PASSWORD_HINT_TEXT}
              </p>
            )}
            <div className="field">
              <label htmlFor="password-confirm">비밀번호 확인</label>
              <input
                id="password-confirm"
                type="password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>
            <fieldset>
              <legend>개인정보 수집·이용 동의 (필수)</legend>
              <div className="radio-row">
                <input
                  id="consent-collection"
                  type="checkbox"
                  checked={collectionUse}
                  onChange={(e) => setCollectionUse(e.target.checked)}
                />
                <label htmlFor="consent-collection">
                  생년·성별·직군·재학/재직 여부 수집·이용에 동의합니다.
                </label>
              </div>
              <div className="radio-row">
                <input
                  id="consent-overseas"
                  type="checkbox"
                  checked={overseasTransfer}
                  onChange={(e) => setOverseasTransfer(e.target.checked)}
                />
                <label htmlFor="consent-overseas">
                  대화·선호 정보를 DeepSeek(국외)·Gemini(국외, 임베딩)로 전송하는 것에
                  동의합니다.
                </label>
              </div>
              <p className="hint-text">
                동의 항목: {CONSENT_TYPES.length}개 모두 체크해야 가입할 수 있습니다.
                자세한 내용은 <a href="/privacy-policy">개인정보 처리방침</a>을 확인하세요.
              </p>
            </fieldset>
          </>
        )}

        {/* anyang-frontend-screens 1-1절 — 429(TOO_MANY_ATTEMPTS)는 계정 열거 방지를 위해
            401/일반 오류(error-text)와 시각적으로 구분되는 banner로 표시한다. */}
        {blocked && (
          <p className="banner" role="alert">
            {TOO_MANY_ATTEMPTS_TEXT}
          </p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || (mode === "register" && !canSubmitRegister)}
          className="btn-block"
        >
          {mode === "login" ? "로그인" : "가입하기"}
        </button>
      </form>
    </AuthLayoutSplit>
  );
}
