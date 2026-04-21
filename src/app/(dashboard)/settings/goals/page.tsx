import { Target } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listGoals } from "@/services/goals.service";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { GoalCreateModal } from "@/components/goals/GoalCreateModal";
import { GoalsTable } from "@/components/goals/GoalsTable";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const supabase = await createClient();
  const goals = await listGoals(supabase).catch(() => []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Metas
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure metas mensais por motor ou mentoria. As barras de
            progresso aparecem nos cards do dashboard.
          </p>
        </div>
        <GoalCreateModal />
      </header>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta cadastrada"
          description="Crie a primeira meta para acompanhar o progresso no dashboard."
        />
      ) : (
        <Card className="space-y-3 p-5">
          <h2 className="font-heading text-base font-semibold">
            Metas ativas ({goals.length})
          </h2>
          <GoalsTable goals={goals} />
        </Card>
      )}
    </div>
  );
}
