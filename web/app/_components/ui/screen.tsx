// 탭 화면 제목. 상태바 영역(safe-area)만큼 위를 비운다.
export function ScreenHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex flex-col gap-1.5 px-gutter pt-[calc(env(safe-area-inset-top)+20px)] pb-5">
      <h1 className="m-0 font-display text-display">{title}</h1>
      {description && <p className="m-0 text-body-sm text-ink-2">{description}</p>}
    </header>
  );
}
