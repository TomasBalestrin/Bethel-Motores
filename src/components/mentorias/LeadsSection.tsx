"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { AllLeadsPanel } from "./AllLeadsPanel";
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
  const [activeId, setActiveId] = useState<string>("all");

  if (funnels.length === 0) return null;

  const allCount = funnels.reduce((sum, f) => sum + f.count, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveId("all")}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeId === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          Geral
          <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {allCount}
          </span>
        </button>
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

      {activeId === "all" ? (
        <AllLeadsPanel
          mentoriaId={mentoriaId}
          mentoriaName={mentoriaName}
          funnels={funnels}
        />
      ) : null}

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
