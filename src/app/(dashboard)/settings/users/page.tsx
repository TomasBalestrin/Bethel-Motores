import type { Metadata } from "next";
import { Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listUsers } from "@/services/users.service";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserInviteModal } from "@/components/users/UserInviteModal";
import { UsersTable } from "@/components/users/UsersTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const users = await listUsers(supabase).catch(() => []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            Convide pessoas, ajuste roles e desative acessos.
          </p>
        </div>
        <UserInviteModal />
      </header>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário cadastrado"
          description="Convide o primeiro usuário para começar."
        />
      ) : (
        <Card className="space-y-3 p-5">
          <h2 className="font-heading text-base font-semibold">
            {users.length === 1 ? "1 usuário" : `${users.length} usuários`}
          </h2>
          <UsersTable users={users} currentUserId={user?.id ?? null} />
        </Card>
      )}
    </div>
  );
}
