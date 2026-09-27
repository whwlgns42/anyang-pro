"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CONSENT_TYPES } from "@/lib/consent";

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
  const [submitting, setSubmitting] = useState(false);

  const canSubmitRegister =
    email && password && password === passwordConfirm && collectionUse && overseasTransfer;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);
    if (res?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.push("/post-login");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    if (res.status === 409) {
      setSubmitting(false);
      setError("이미 가입된 이메일입니다.");
      return;
    }
    if (res.status === 403) {
      const body = await res.json().catch(() => null);
      setSubmitting(false);
      if (body?.error === "ADMIN_EMAIL_RESERVED") {
        setError("이 이메일은 비밀번호로 가입할 수 없습니다. Google로 로그인해 주세요.");
      } else {
        setError("가입할 수 없습니다.");
      }
      return;
    }
    if (!res.ok) {
      setSubmitting(false);
      setError("가입 중 오류가 발생했습니다.");
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
    <main className="page page--narrow">
      <h1>안양 청년정책 비서</h1>

      <button type="button" onClick={handleGoogle} style={{ width: "100%", marginBottom: 16 }}>
        Google로 계속하기
      </button>

      <div role="tablist" aria-label="로그인 또는 가입 선택" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || (mode === "register" && !canSubmitRegister)}
          style={{ width: "100%" }}
        >
          {mode === "login" ? "로그인" : "가입하기"}
        </button>
      </form>
    </main>
  );
}
