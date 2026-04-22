"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { LeadsPanel } from "./LeadsPanel";

interface FunnelOption {
  id: string;
  name: string;
  count: number;
}

interface LeadsSectionProps {
  mentoriaId: string;
  mentoriaName: string;
  funnels: FunnelOption[];
}

export function LeadsSection({
  mentoriaId,
  mentoriaName,
  funnels,
}: LeadsSectionProps) {
  const [activeId, setActiveId] = useState<string>(() => funnels[0]?.id ?? "");

  if (funnels.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {funnels.map((funnel) => {
          const active = funnel.id === activeId;
          return (
            <button
              key={funnel.id}
              type="button"
              onClick={() => setActiveId(funnel.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {funnel.name}
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {funnel.count}
              </span>
            </button>
          );
        })}
      </div>

      {funnels.map((funnel) =>
        funnel.id === activeId ? (
          <LeadsPanel
            key={funnel.id}
            mentoriaId={mentoriaId}
            mentoriaName={mentoriaName}
            funnelId={funnel.id}
            funnelName={funnel.name}
          />
        ) : null
      )}
    </section>
  );
}
