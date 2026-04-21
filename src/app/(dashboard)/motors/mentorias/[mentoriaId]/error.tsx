"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function MentoriaDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/motors/mentorias/[id]]", error.message, error.digest);
  }, [error]);

  return (
    <ErrorState
      title="Não foi possível carregar esta mentoria"
      description="Verifique se a mentoria ainda existe e tente novamente."
      onReset={reset}
      backHref="/motors/mentorias/listagem"
      backLabel="Voltar para Listagem"
    />
  );
}
