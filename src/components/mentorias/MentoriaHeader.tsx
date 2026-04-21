import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeBR } from "@/lib/utils/format";
import type { MentoriaDetail } from "@/types/mentoria";

interface MentoriaHeaderProps {
  mentoria: MentoriaDetail;
}

export function MentoriaHeader({ mentoria }: MentoriaHeaderProps) {
  const statusLabel =
    mentoria.status === "concluida" ? "Concluída" : "Em andamento";
  const statusClasses =
    mentoria.status === "concluida"
      ? "bg-success/10 text-success border-success/20"
      : "bg-warning/10 text-warning border-warning/20";

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {mentoria.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDateTimeBR(mentoria.scheduled_at)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn("rounded-full border text-[11px]", statusClasses)}
          >
            {statusLabel}
          </Badge>
          {mentoria.specialist ? (
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 text-[11px] text-primary"
            >
              {mentoria.specialist.name}
            </Badge>
          ) : null}
        </div>
      </div>

      <Button variant="outline" disabled>
        <Pencil className="mr-1 h-4 w-4" />
        Editar
      </Button>
    </header>
  );
}
