// 공지 상세의 첨부 파일명 목록. 0개이거나 배열이 아니면 영역을 그리지 않는다.
// 파일명은 글자로만 보인다(downloadBbsFile.do 직접 링크가 세션 없이 열리는지 미확인, 55-i). url은 쓰지 않는다.
export function Attachments({ attachments, hasSource }: { attachments?: { name: string }[]; hasSource: boolean }) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5 border-t border-rule pt-5">
      <h2 id="attachments-title" className="m-0 text-label text-ink-2">
        첨부 파일 {attachments.length}개
      </h2>
      <ul aria-labelledby="attachments-title" className="m-0 flex list-none flex-col gap-1.5 p-0 text-body-sm">
        {attachments.map((a, i) => (
          <li key={i} className="break-all">
            {a.name}
          </li>
        ))}
      </ul>
      {hasSource && <p className="m-0 text-meta text-ink-3">파일은 원문 페이지에서 받을 수 있어요.</p>}
    </section>
  );
}
