import Link from "next/link";
import { formatDate } from "../../_lib/format";
import { Icon } from "./icon";

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

type NoticeRowProps = {
  id: string;
  title: string;
  excerpt: string;
  postedAt: string | null;
  isPinned?: boolean;
  imageCount?: number;
};

// 공지 목록의 한 줄. 고정 공지는 별표 + 굵은 제목(일반 공지는 500), image_count>0이면 "본문 이미지" 칩.
// 별표는 장식이라 숨기고 같은 링크 안에 읽기 글자 "고정 공지, "를 둔다.
export function NoticeRow({ id, title, excerpt, postedAt, isPinned, imageCount }: NoticeRowProps) {
  const day = formatDate(postedAt);
  return (
    <li className="border-b border-rule">
      <Link href={`/notices/${id}`} className="flex flex-col gap-1.5 py-4 text-ink no-underline">
        <span className={`flex items-start gap-1.5 text-title ${isPinned ? "font-semibold" : "font-medium"}`}>
          {isPinned && <Icon name="star" size={16} className="mt-[3px] text-accent" />}
          <span className="line-clamp-2">
            {isPinned && <span className="sr-only">고정 공지, </span>}
            {title}
          </span>
        </span>
        {excerpt && <span className="line-clamp-2 text-body-sm text-ink-2">{excerpt}</span>}
        {(day || (imageCount ?? 0) > 0) && (
          <span className="flex items-center gap-2">
            {day && (
              <time dateTime={postedAt ?? undefined} className="font-mono text-meta text-ink-3">
                {day}
              </time>
            )}
            {(imageCount ?? 0) > 0 && (
              <span className="rounded-badge border border-rule px-1.5 text-meta text-ink-2">본문 이미지</span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}
