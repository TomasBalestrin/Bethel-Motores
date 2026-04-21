"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("[DASHBOARD_ERROR]", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold">Algo deu errado</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Não conseguimos carregar esta seção. Tente novamente em instantes.
        </p>
      </div>
      <Button onClick={reset} variant="default">
        <RotateCcw className="mr-2 h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  );
}
