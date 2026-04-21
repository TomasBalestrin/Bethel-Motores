"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
  indent?: boolean;
  exact?: boolean;
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  collapsed = false,
  indent = false,
  exact = false,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
        collapsed && "justify-center px-2",
        !collapsed && indent && "pl-9"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}
