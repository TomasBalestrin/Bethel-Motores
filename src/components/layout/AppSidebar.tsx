"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { SidebarNavContent } from "./SidebarNavContent";

export function AppSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-accent/15 bg-primary text-primary-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-[260px]"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center px-7",
          collapsed ? "justify-center px-3" : "justify-between"
        )}
      >
        {!collapsed ? (
          <div className="space-y-0.5">
            <h2 className="font-heading text-lg font-bold tracking-tight text-white">
              Bethel
            </h2>
            <span className="block text-[11px] font-medium uppercase tracking-[2px] text-accent">
              Motores
            </span>
          </div>
        ) : null}
        <button
          type="button"
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-white/55 transition-colors hover:bg-accent/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <SidebarNavContent collapsed={collapsed} />
    </aside>
  );
}
