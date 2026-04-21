import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import {
  listAudit,
  listDistinctEntityTypes,
} from "@/services/audit.service";
import { listUsers } from "@/services/users.service";
import { Card } from "@/components/ui/card";
import { AuditTable } from "@/components/settings/AuditTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Auditoria" };

interface PageProps {
  searchParams: {
    entity_type?: string;
    user_id?: string;
    from?: string;
    to?: string;
  };
}

export default async function AuditPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const [entries, entityTypes, users] = await Promise.all([
    listAudit(supabase, {
      entityType: searchParams.entity_type,
      userId: searchParams.user_id,
      from: searchParams.from,
      to: searchParams.to,
      limit: 200,
    }).catch(() => []),
    listDistinctEntityTypes(supabase).catch(() => [] as string[]),
    listUsers(supabase).catch(() => []),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Auditoria
        </h1>
        <p className="text-sm text-muted-foreground">
          Histórico de mudanças críticas — retendo até 200 registros mais
          recentes.
        </p>
      </header>

      <Card className="space-y-3 p-5">
        <AuditTable
          entries={entries}
          entityTypes={entityTypes}
          users={users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
          }))}
          initial={{
            entityType: searchParams.entity_type,
            userId: searchParams.user_id,
            from: searchParams.from,
            to: searchParams.to,
          }}
        />
      </Card>
    </div>
  );
}
