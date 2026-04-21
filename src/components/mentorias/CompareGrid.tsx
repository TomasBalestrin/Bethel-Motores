import { cn } from "@/lib/utils";
import { MentoriaCard } from "./MentoriaCard";
import type { MentoriaWithMetrics } from "@/types/mentoria";

interface CompareGridProps {
  mentorias: MentoriaWithMetrics[];
}

const COLS_BY_COUNT: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function CompareGrid({ mentorias }: CompareGridProps) {
  const gridCols = COLS_BY_COUNT[mentorias.length] ?? "lg:grid-cols-2";

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", gridCols)}>
      {mentorias.map((mentoria, index) => (
        <div key={mentoria.id} className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {index === 0 ? "Base" : `Comparação ${index}`}
          </p>
          <MentoriaCard mentoria={mentoria} />
        </div>
      ))}
    </div>
  );
}
