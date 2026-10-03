"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../_lib/api-fetch";
import { buttonClass } from "../../_components/ui/controls";
import { ListRow } from "../../_components/ui/notice-row";
import { ScreenHeader } from "../../_components/ui/screen";

type Conversation = { id: string; title: string | null; updated_at: string };

// anyang-frontend-screens 8절 + 청안 적용 "시안 없는 화면" 표: updated_at desc 목록, 새 대화 시작,
// 항목 클릭 시 /chat?conversation_id=...로 이어서 연다. 행 모양은 공지 목록 행과 같다.
export function ConversationsClient() {
  const [items, setItems] = useState<Conversation[] | null>(null);

  useEffect(() => {
    apiFetch("/api/conversations").then(async (res) => {
      if (res.ok) setItems(await res.json());
    });
  }, []);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <ScreenHeader title="대화 기록" />
        <div className="px-gutter pb-6">
          <Link href="/chat" className={`${buttonClass("secondary")} w-full`}>
            새 대화 시작
          </Link>
          {items === null ? (
            <p className="m-0 pt-4 text-body-sm text-ink-2">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="m-0 pt-4 text-body-sm text-ink-2">아직 대화 기록이 없어요.</p>
          ) : (
            <ol className="m-0 mt-4 list-none border-t-2 border-ink p-0">
              {items.map((c) => (
                <ListRow
                  key={c.id}
                  href={`/chat?conversation_id=${c.id}`}
                  title={c.title ?? "제목 없는 대화"}
                  date={c.updated_at}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}
