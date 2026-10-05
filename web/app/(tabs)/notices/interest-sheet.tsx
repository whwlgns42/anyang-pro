import Link from "next/link";
import { sheetView, type InterestStatus } from "../../_lib/interest-sheet";
import { Button } from "../../_components/ui/controls";
import { Icon } from "../../_components/ui/icon";

type Props = {
  status: InterestStatus;
  items: { id: string; preference_text: string }[];
  onRetry: () => void;
};

// 관심사 시트 본문(읽기 전용). 수정·삭제는 내 정보의 기억 구역에서만 한다.
// 목록만 스크롤하고 아래 링크 줄은 고정이다.
export function InterestSheetBody({ status, items, onRetry }: Props) {
  const view = sheetView(status, items.length);
  if (view === "loading") {
    return (
      <p className="m-0 px-gutter pt-1 pb-6 text-body-sm text-ink-2" role="status">
        불러오는 중...
      </p>
    );
  }
  if (view === "error") {
    return (
      <div className="flex flex-col items-start gap-3 px-gutter pt-1 pb-6">
        <p className="m-0 text-body-sm font-medium text-danger" role="alert">
          관심사를 불러오지 못했어요.
        </p>
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    );
  }
  if (view === "empty") {
    return (
      <p className="m-0 px-gutter pt-1 pb-6 text-body-sm text-ink-2">
        아직 모인 관심사가 없어요. 대화에서 알려주신 내용이 쌓이면 여기에 보여요.
      </p>
    );
  }
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter pt-1 pb-4">
        <ul className="m-0 list-none divide-y divide-rule rounded-control border border-rule bg-surface p-0">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3 text-body">
              {item.preference_text}
            </li>
          ))}
        </ul>
      </div>
      <Link
        href="/settings#memory"
        className="flex min-h-touch shrink-0 items-center justify-between border-t border-rule px-gutter text-body-sm font-medium text-ink no-underline"
      >
        내 정보에서 관리
        <Icon name="chevron-right" size={18} />
      </Link>
    </>
  );
}
