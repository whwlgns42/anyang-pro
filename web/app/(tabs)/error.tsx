"use client";

import { ErrorView } from "../_components/ui/error-view";

export default function TabsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
