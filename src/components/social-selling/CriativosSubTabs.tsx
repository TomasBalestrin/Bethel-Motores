"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import type { PostType } from "@/types/post";

interface Tab {
  value: PostType;
  label: string;
}

const TABS: Tab[] = [
  { value: "impulsionar", label: "Impulsionar" },
  { value: "organico", label: "Orgânico" },
];

interface CriativosSubTabsProps {
  active: PostType;
  counts?: Record<PostType, number>;
}

export function CriativosSubTabs({ active, counts }: CriativosSubTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildHref(type: PostType): string {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tipo", type);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <Link
            key={tab.value}
            href={buildHref(tab.value)}
            scroll={false}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {tab.label}
            {counts ? (
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {counts[tab.value] ?? 0}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
