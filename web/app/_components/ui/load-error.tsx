import { Button } from "./controls";

// anyang-frontend-screens 15-4절: 불러오기 실패 문구 + 다시 시도. 여백은 호출 쪽이 정한다.
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="m-0 text-body-sm font-medium text-danger" role="alert">
        {message}
      </p>
      <Button variant="secondary" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
