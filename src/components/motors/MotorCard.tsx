import Link from "next/link";
import {
  Boxes,
  GraduationCap,
  Megaphone,
  Rocket,
  Layers,
  Target,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { MotorWithStats } from "@/types/motor";

interface MotorCardProps {
  motor: MotorWithStats;
}

const ICON_REGISTRY: Record<string, LucideIcon> = {
  GraduationCap,
  Megaphone,
  Rocket,
  Layers,
  Target,
  Boxes,
};

function resolveIcon(iconName: string | null): LucideIcon {
  if (!iconName) return Boxes;
  return ICON_REGISTRY[iconName] ?? Boxes;
}

export function MotorCard({ motor }: MotorCardProps) {
  const Icon = resolveIcon(motor.icon);

  return (
    <Link
      href={`/motors/${motor.slug}`}
      prefetch
      className={cn(
        "group flex flex-col gap-4 rounded-lg border border-border bg-card p-6",
        "transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-semibold tracking-tight">
          {motor.name}
        </h3>
        {motor.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {motor.description}
          </p>
        ) : null}
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {motor.stats.label}
      </p>
    </Link>
  );
}
