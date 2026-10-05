"use client";

import { ErrorView } from "./_components/ui/error-view";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-column flex-col">
      <ErrorView error={error} retry={retry} />
    </div>
  );
}
