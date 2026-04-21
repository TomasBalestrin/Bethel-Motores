import Link from "next/link";
import { Clock, Plug } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateTimeBR } from "@/lib/utils/format";
import type { IntegrationSource } from "@/services/integrations.service";

interface SourceCardProps {
  source: IntegrationSource;
}

export function SourceCard({ source }: SourceCardProps) {
  return (
    <Link
      href={`/settings/integrations/${source.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Plug className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <p className="font-heading text-base font-semibold">
                {source.name}
              </p>
              <code className="text-[10px] text-muted-foreground">
                {source.slug}
              </code>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border text-[10px] capitalize",
                source.is_active
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {source.is_active ? "Ativa" : "Inativa"}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 text-[10px] text-primary"
            >
              {source.type}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {source.last_received_at
            ? `Último evento ${formatDateTimeBR(source.last_received_at)}`
            : "Nenhum evento recebido ainda"}
        </div>
      </Card>
    </Link>
  );
}
