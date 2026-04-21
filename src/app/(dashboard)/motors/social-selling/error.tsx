"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function SocialSellingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/motors/social-selling]", error.message, error.digest);
  }, [error]);

  return (
    <ErrorState
      title="Não foi possível carregar Social Selling"
      description="Tente novamente em instantes ou volte para a seleção de motores."
      onReset={reset}
      backHref="/motors"
    />
  );
}
