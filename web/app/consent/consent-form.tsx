"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../_lib/auth-layout";

// anyang-frontend-screens 7절: 체크박스 2개(수집·이용, AI 활용) 모두 필수. 재동의 진입 시에도
// 같은 화면을 재사용하고, 탈퇴 경로(8-1절, /settings/account)를 함께 보여준다. 두 번째
// 체크박스 문구는 확인 항목 41(user, 2026-09-28)로 국가명·서비스명 없는 표현으로 단순화됐다
// — 코드 식별자 overseas_transfer·필수 검증·API body는 그대로다.
export default function ConsentFormInner() {
  const router = useRouter();
  const [collectionUse, setCollectionUse] = useState(false);
  const [overseasTransfer, setOverseasTransfer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = collectionUse && overseasTransfer;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/auth/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        consents: { collection_use: collectionUse, overseas_transfer: overseasTransfer },
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("동의 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      return;
    }
    router.push("/post-login");
  }

  return (
    <AuthLayout>
      <h1>개인정보 동의</h1>
      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>수집·이용 동의 (필수)</legend>
          <div className="radio-row">
            <input
              id="consent-collection"
              type="checkbox"
              checked={collectionUse}
              onChange={(e) => setCollectionUse(e.target.checked)}
            />
            <label htmlFor="consent-collection">
              생년·성별·직군·재학/재직 여부를 서비스 제공 목적으로 수집·이용하는 것에
              동의합니다.
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>AI 활용 동의 (필수)</legend>
          <div className="radio-row">
            <input
              id="consent-overseas"
              type="checkbox"
              checked={overseasTransfer}
              onChange={(e) => setOverseasTransfer(e.target.checked)}
            />
            <label htmlFor="consent-overseas">
              대화 내용을 AI가 처리하는 것에 동의합니다. 대화 내용 중 전화번호·이메일·
              주민등록번호 형태는 전송 전 가려집니다.
            </label>
          </div>
        </fieldset>
        <p className="hint-text">
          자세한 내용은 <a href="/privacy-policy">개인정보 처리방침</a>을 확인하세요.
        </p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={!canSubmit || submitting} className="btn-block">
          동의하고 계속하기
        </button>
      </form>
      <p className="hint-text hint-text--spaced">
        동의하지 않고 <a href="/settings/account">탈퇴</a>할 수도 있습니다.
      </p>
    </AuthLayout>
  );
}

export { ConsentFormInner as ConsentForm };
