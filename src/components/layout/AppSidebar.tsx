"use client";

import type { LucideIcon } from "lucide-react";
import {
  ChevronsLeft,
  ChevronsRight,
  FileClock,
  GraduationCap,
  Layers,
  Megaphone,
  Plug,
  Settings,
  Target,
  Users,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { useUser } from "@/hooks/useUser";
import type { UserRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarNavItem } from "./SidebarNavItem";

interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  indent?: boolean;
  exact?: boolean;
  roles?: readonly UserRole[];
}

const MOTORS_NAV: NavEntry[] = [
  { href: "/motors", label: "Motores", icon: Layers, exact: true },
  {
    href: "/motors/mentorias",
    label: "Mentorias",
    icon: GraduationCap,
    indent: true,
  },
  {
    href: "/motors/social-selling",
    label: "Social Selling",
    icon: Megaphone,
    indent: true,
  },
];

const SETTINGS_NAV: NavEntry[] = [
  { href: "/settings", label: "Settings", icon: Settings, exact: true },
  {
    href: "/settings/users",
    label: "Usuários",
    icon: Users,
    indent: true,
    roles: ["admin"],
  },
  {
    href: "/settings/integrations",
    label: "Integrações",
    icon: Plug,
    indent: true,
    roles: ["admin", "gestor_infra"],
  },
  {
    href: "/settings/funnel-templates",
    label: "Templates de Funil",
    icon: Workflow,
    indent: true,
    roles: ["admin", "gestor_infra"],
  },
  {
    href: "/settings/goals",
    label: "Metas",
    icon: Target,
    indent: true,
    roles: ["admin"],
  },
  {
    href: "/settings/audit",
    label: "Auditoria",
    icon: FileClock,
    indent: true,
    roles: ["admin"],
  },
];

function canSee(entry: NavEntry, role: UserRole | undefined): boolean {
  if (!entry.roles) return true;
  if (!role) return false;
  return entry.roles.includes(role);
}

export function AppSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const { profile } = useUser();
  const role = profile?.role;

  const motorsItems = MOTORS_NAV.filter((item) => canSee(item, role));
  const settingsItems = SETTINGS_NAV.filter((item) => canSee(item, role));

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed ? (
          <span className="font-heading text-sm font-semibold">Bethel Motores</span>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          onClick={toggle}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {motorsItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            indent={item.indent}
            exact={item.exact}
          />
        ))}

        <Separator className="my-2" />

        {settingsItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            indent={item.indent}
            exact={item.exact}
          />
        ))}
      </nav>
    </aside>
  );
}
