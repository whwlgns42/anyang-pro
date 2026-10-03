import Link from "next/link";
import { formatDate } from "../../_lib/format";

type RowProps = {
  href: string;
  title: string;
  /** 없으면 줄을 그리지 않는다 */
  excerpt?: string | null;
  date: string | null;
};

// 목록 한 줄(공지 목록, 대화 기록 공통): 제목 + 보조 줄 + 날짜, 아래 rule 선. 제목·발췌는 2줄에서 자른다.
export function ListRow({ href, title, excerpt, date }: RowProps) {
  const day = formatDate(date);
  return (
    <li className="border-b border-rule">
      <Link href={href} className="flex flex-col gap-1.5 py-4 text-ink no-underline">
        <span className="line-clamp-2 text-title">{title}</span>
        {excerpt && <span className="line-clamp-2 text-body-sm text-ink-2">{excerpt}</span>}
        {day && (
          <time dateTime={date ?? undefined} className="font-mono text-meta text-ink-3">
            {day}
          </time>
        )}
      </Link>
    </li>
  );
}

// 공지 목록의 한 줄.
export function NoticeRow(props: { id: string; title: string; excerpt: string; postedAt: string | null }) {
  return <ListRow href={`/notices/${props.id}`} title={props.title} excerpt={props.excerpt} date={props.postedAt} />;
}
