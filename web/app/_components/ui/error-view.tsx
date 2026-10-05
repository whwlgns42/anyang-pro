"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonClass } from "./controls";

// anyang-frontend-screens 15-5절: app/error.tsx와 app/(tabs)/error.tsx가 함께 쓴다.
// error.message·digest는 화면에 보이지 않는다.
export function ErrorView({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-0 flex-1 flex-col justify-center gap-6 px-gutter py-10">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-display-sm">문제가 생겼어요</h1>
        <p className="m-0 text-body-sm text-ink-2">잠시 후 다시 시도해 주세요.</p>
      </div>
      <div className="flex flex-col items-start gap-3">
        <Button onClick={retry}>다시 시도</Button>
        <Link href="/chat" className={buttonClass("secondary")}>
          채팅으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
