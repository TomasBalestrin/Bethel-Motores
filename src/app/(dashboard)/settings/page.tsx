import type { Metadata } from "next";
import Link from "next/link";
import {
  FileClock,
  Plug,
  Settings as SettingsIcon,
  Target,
  User as UserIcon,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/services/users.service";
import { Card } from "@/components/ui/card";
import type { UserRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

interface Entry {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

const ENTRIES: Entry[] = [
  {
    href: "/settings/profile",
    label: "Perfil",
    description: "Seus dados e preferências",
    icon: UserIcon,
  },
  {
    href: "/settings/users",
    label: "Usuários",
    description: "Convites, roles e desativação",
    icon: Users,
    roles: ["admin"],
  },
  {
    href: "/settings/integrations",
    label: "Integrações",
    description: "Fontes de webhook e mapping",
    icon: Plug,
    roles: ["admin", "gestor_infra"],
  },
  {
    href: "/settings/funnel-templates",
    label: "Templates de Funil",
    description: "Campos que cada funil herda",
    icon: Workflow,
    roles: ["admin", "gestor_infra"],
  },
  {
    href: "/settings/goals",
    label: "Metas",
    description: "Alvos por motor × mentoria × mês",
    icon: Target,
    roles: ["admin"],
  },
  {
    href: "/settings/audit",
    label: "Auditoria",
    description: "Histórico de mudanças críticas",
    icon: FileClock,
    roles: ["admin"],
  },
];

function canSee(entry: Entry, role: UserRole | undefined): boolean {
  if (!entry.roles) return true;
  if (!role) return false;
  return entry.roles.includes(role);
}

export default async function SettingsHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getUserProfile(supabase, user.id) : null;
  const role = profile?.role;

  const entries = ENTRIES.filter((entry) => canSee(entry, role));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configurações do app e da conta.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="flex h-full items-start gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-heading text-base font-semibold">
                    {entry.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.description}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
