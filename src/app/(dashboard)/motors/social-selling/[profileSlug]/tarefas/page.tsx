import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getProfileBySlug } from "@/services/social-profiles.service";
import { listTasksByProfile } from "@/services/tasks.service";
import { listUsers } from "@/services/users.service";
import { Card } from "@/components/ui/card";
import { KanbanBoard } from "@/components/social-selling/KanbanBoard";

interface PageProps {
  params: { profileSlug: string };
}

export default async function TarefasPage({ params }: PageProps) {
  const supabase = await createClient();
  const profile = await getProfileBySlug(supabase, params.profileSlug);
  if (!profile) notFound();

  const [tasks, users] = await Promise.all([
    listTasksByProfile(supabase, profile.id).catch(() => []),
    listUsers(supabase).catch(() => []),
  ]);

  const assignees = users
    .filter((user) => user.is_active)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold">Tarefas</h2>
        <p className="text-xs text-muted-foreground">
          Kanban standalone do perfil. Arraste cards para mudar status.
        </p>
      </div>

      <Card className="p-4">
        <KanbanBoard
          profileId={profile.id}
          initialTasks={tasks}
          assignees={assignees}
        />
      </Card>
    </div>
  );
}
