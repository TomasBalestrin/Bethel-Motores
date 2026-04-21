import Link from "next/link";
import { Plus, Workflow } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/services/funnels.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTimeBR } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function FunnelTemplatesPage() {
  const supabase = await createClient();
  const templates = await listTemplates(supabase).catch(() => []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Templates de Funil
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina os campos que cada funil terá e gerencie o template padrão.
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/funnel-templates/new">
            <Plus className="mr-1 h-4 w-4" />
            Novo template
          </Link>
        </Button>
      </header>

      {templates.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Nenhum template configurado"
          description="Crie um template para começar a cadastrar funis nas mentorias."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/settings/funnel-templates/${template.id}`}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <Card className="flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-base font-semibold">
                    {template.name}
                  </h2>
                  {template.is_default ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/30 bg-primary/10 text-[10px] text-primary"
                    >
                      Padrão
                    </Badge>
                  ) : null}
                </div>
                {template.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>
                    {template.fieldCount}{" "}
                    {template.fieldCount === 1 ? "campo" : "campos"}
                  </span>
                  <span>
                    {template.funnelCount}{" "}
                    {template.funnelCount === 1 ? "funil usando" : "funis usando"}
                  </span>
                  <span>Atualizado em {formatDateTimeBR(template.updated_at)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
