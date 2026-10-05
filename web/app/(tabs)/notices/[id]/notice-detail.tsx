"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../_lib/api-fetch";
import { formatDate, isHttpUrl, splitLinks } from "../../../_lib/format";
import { LoadError } from "../../../_components/ui/load-error";
import { buttonClass } from "../../../_components/ui/controls";
import { Icon } from "../../../_components/ui/icon";
import { Attachments } from "./attachments";

type Notice = {
  id: string;
  title: string;
  body: string;
  source_url: string;
  posted_at: string | null;
  attachments?: { name: string; url: string }[];
  image_count?: number;
};

const LOAD_FAILED = "공지를 불러오지 못했어요.";

// anyang-frontend-screens "청안 디자인 적용 화면 스펙" 3번(공지 상세). source_url은 새 탭으로만
// 연다(iframe 임베드 없음). http(s)로 시작할 때만 링크로 그린다.
export function NoticeDetail({ id }: { id: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/notices/${id}`);
        if (cancelled) return;
        if (res.status === 404) {
          setError({ message: "존재하지 않거나 숨김 처리된 공지입니다.", notFound: true });
          return;
        }
        if (!res.ok) {
          if (res.status !== 403) setError({ message: LOAD_FAILED, notFound: false });
          return;
        }
        const data = await res.json();
        if (!cancelled) setNotice(data);
      } catch {
        if (!cancelled) setError({ message: LOAD_FAILED, notFound: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, tries]);

  // 푸시 알림으로 바로 연 경우(히스토리 없음)에는 공지 목록으로.
  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/notices");
  }

  const day = formatDate(notice?.posted_at);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-2 pt-[calc(env(safe-area-inset-top)+4px)]">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex h-touch items-center gap-0.5 rounded-none border-0 bg-transparent pr-3 pl-1 text-body font-normal text-ink"
        >
          <Icon name="chevron-left" />
          <span>공지</span>
        </button>
      </div>

      {error ? (
        <div className="flex flex-1 flex-col items-start gap-4 px-gutter pt-6">
          {error.notFound ? (
            <>
              <p className="m-0 text-body">{error.message}</p>
              <Link href="/notices" className={buttonClass("secondary")}>
                공지 목록으로
              </Link>
            </>
          ) : (
            <LoadError
              message={error.message}
              onRetry={() => {
                setError(null);
                setTries((n) => n + 1);
              }}
            />
          )}
        </div>
      ) : !notice ? (
        <p className="m-0 px-gutter pt-6 text-body-sm text-ink-2">불러오는 중...</p>
      ) : (
        <>
          <article className="flex flex-1 flex-col gap-5 overflow-y-auto px-gutter pt-2 pb-6">
            <div className="flex flex-col gap-2.5">
              <h1 className="m-0 font-display text-display-sm">{notice.title}</h1>
              {day && (
                <span className="font-mono text-meta text-ink-3">
                  게시 <time dateTime={notice.posted_at ?? undefined}>{day}</time>
                </span>
              )}
            </div>
            <hr className="m-0 border-0 border-t border-rule" />
            <div className="text-body whitespace-pre-line">
              {splitLinks(notice.body).map((part, i) =>
                part.href ? (
                  <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
                    {part.text}
                  </a>
                ) : (
                  part.text
                ),
              )}
            </div>
            <Attachments attachments={notice.attachments} hasSource={isHttpUrl(notice.source_url)} />
          </article>

          {isHttpUrl(notice.source_url) && (
            <div className="shrink-0 border-t border-rule px-gutter pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <a
                href={notice.source_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="원문 페이지에서 보기, 새 창에서 열림"
                className={`${buttonClass("primary", "lg")} w-full`}
              >
                원문 페이지에서 보기
                <Icon name="external" size={18} strokeWidth={1.8} />
              </a>
            </div>
          )}
        </>
      )}
    </main>
  );
}
