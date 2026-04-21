"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  motors: "Motores",
  mentorias: "Mentorias",
  "social-selling": "Social Selling",
  listagem: "Listagem",
  comparar: "Comparar",
  trafego: "Tráfego",
  disparos: "Disparos",
  criativos: "Criativos",
  tarefas: "Tarefas",
  settings: "Settings",
  users: "Usuários",
  integrations: "Integrações",
  "funnel-templates": "Templates de Funil",
  goals: "Metas",
  audit: "Auditoria",
  profile: "Perfil",
};

function humanize(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]!;
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <ol className="flex items-center gap-1">
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          const label = humanize(segment);

          return (
            <li key={href} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className={cn(
                    "text-muted-foreground transition-colors hover:text-foreground"
                  )}
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
