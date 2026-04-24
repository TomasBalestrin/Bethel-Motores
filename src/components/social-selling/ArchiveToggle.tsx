"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

interface ArchiveToggleProps {
  view: "ativos" | "arquivados";
  ativosCount: number;
  arquivadosCount: number;
}

export function ArchiveToggle({
  view,
  ativosCount,
  arquivadosCount,
}: ArchiveToggleProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildHref(next: "ativos" | "arquivados"): string {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "ativos") {
      params.delete("view");
    } else {
      params.set("view", next);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  const active = "border-primary bg-primary/10 text-primary";
  const inactive =
    "border-border bg-background text-muted-foreground hover:border-muted-foreground";

  return (
    <div className="flex gap-2">
      <Link
        href={buildHref("ativos")}
        scroll={false}
        className={cn(base, view === "ativos" ? active : inactive)}
      >
        Ativos
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-semibold",
            view === "ativos"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {ativosCount}
        </span>
      </Link>
      <Link
        href={buildHref("arquivados")}
        scroll={false}
        className={cn(base, view === "arquivados" ? active : inactive)}
      >
        Arquivados
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-semibold",
            view === "arquivados"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {arquivadosCount}
        </span>
      </Link>
    </div>
  );
}
