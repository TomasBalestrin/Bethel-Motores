"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MentoriaTabsProps {
  mentoriaId: string;
}

export function MentoriaTabs({ mentoriaId }: MentoriaTabsProps) {
  const pathname = usePathname();
  const base = `/motors/mentorias/${mentoriaId}`;

  const tabs = [
    { href: base, label: "Dashboard", exact: true },
    { href: `${base}/trafego`, label: "Tráfego" },
    { href: `${base}/disparos`, label: "Disparos" },
  ];

  return (
    <nav
      aria-label="Seções da mentoria"
      className="border-b border-border"
    >
      <ul className="-mb-px flex gap-1">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
