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
      prefetch
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-3 border-l-[3px] px-7 py-[11px] text-[13.5px] font-medium transition-all",
        "border-transparent text-white/55 hover:bg-accent/10 hover:text-white",
        isActive && "border-accent bg-accent/10 text-white",
        collapsed && "justify-center px-3",
        !collapsed && indent && "pl-12"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-opacity",
          isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
        )}
        aria-hidden
      />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}
