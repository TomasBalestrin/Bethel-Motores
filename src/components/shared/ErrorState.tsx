"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title: string;
  description?: string;
  digest?: string;
  onReset?: () => void;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function ErrorState({
  title,
  description,
  digest,
  onReset,
  backHref = "/motors",
  backLabel = "Voltar para Motores",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={
        "flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center " +
        (className ?? "")
      }
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
        {digest ? (
          <p className="pt-1 font-mono text-[11px] text-muted-foreground/70">
            ref: {digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {onReset ? (
          <Button onClick={onReset}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Tentar novamente
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
