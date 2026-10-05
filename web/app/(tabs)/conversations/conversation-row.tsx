import { forwardRef } from "react";
import Link from "next/link";
import { formatDate } from "../../_lib/format";
import { IconButton } from "../../_components/ui/icon";

const short = (text: string) => (text.length > 12 ? `${text.slice(0, 12)}…` : text);

type Props = {
  id: string;
  title: string | null;
  date: string | null;
  onDelete: () => void;
};

// 대화 기록 한 줄: 공지 목록 행(ListRow)과 같은 모양의 링크 + 삭제 버튼. 버튼은 링크 안에 넣지 않고 형제로 둔다.
// 링크는 삭제 뒤 포커스를 옮길 수 있게 ref를 받는다.
export const ConversationRow = forwardRef<HTMLAnchorElement, Props>(function ConversationRow(
  { id, title, date, onDelete },
  ref,
) {
  const text = title ?? "제목 없는 대화";
  const day = formatDate(date);
  return (
    <li className="flex items-center border-b border-rule">
      <Link
        ref={ref}
        href={`/chat?conversation_id=${id}`}
        className="flex min-w-0 flex-1 flex-col gap-1.5 py-4 text-ink no-underline"
      >
        <span className="line-clamp-2 text-title">{text}</span>
        {day && (
          <time dateTime={date ?? undefined} className="font-mono text-meta text-ink-3">
            {day}
          </time>
        )}
      </Link>
      <IconButton icon="trash" iconSize={18} label={`삭제: ${short(text)}`} className="text-ink-3" onClick={onDelete} />
    </li>
  );
});
