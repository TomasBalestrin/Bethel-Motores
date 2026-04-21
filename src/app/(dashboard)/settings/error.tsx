"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/settings]", error.message, error.digest);
  }, [error]);

  return (
    <ErrorState
      title="Não foi possível carregar as configurações"
      description="Confira se você tem permissão para esta seção e tente novamente."
      onReset={reset}
      backHref="/motors"
    />
  );
}
