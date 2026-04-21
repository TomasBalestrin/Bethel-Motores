"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { SidebarNavContent } from "./SidebarNavContent";

export function AppSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
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

      <SidebarNavContent collapsed={collapsed} />
    </aside>
  );
}
