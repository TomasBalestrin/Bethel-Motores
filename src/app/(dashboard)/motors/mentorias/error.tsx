"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function MentoriasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/motors/mentorias]", error.message, error.digest);
  }, [error]);

  return (
    <ErrorState
      title="Não foi possível carregar Mentorias"
      description="Algo deu errado ao buscar dados do motor. Tente novamente ou volte."
      digest={error.digest}
      onReset={reset}
      backHref="/motors"
    />
  );
}
