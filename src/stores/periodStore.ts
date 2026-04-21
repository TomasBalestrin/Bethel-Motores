import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DateRange, Period, PeriodPreset } from "@/types/common";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveRangeFromPreset(
  preset: PeriodPreset,
  today: Date = new Date()
): DateRange {
  const end = new Date(today);
  end.setUTCHours(0, 0, 0, 0);

  if (preset === "month") {
    const start = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)
    );
    return { from: toISODate(start), to: toISODate(end) };
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - days + 1);
  return { from: toISODate(start), to: toISODate(end) };
}

export const DEFAULT_PERIOD: Period = {
  preset: "30d",
  range: resolveRangeFromPreset("30d", new Date()),
};

interface PeriodState {
  period: Period;
  setPeriod: (period: Period) => void;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (range: DateRange) => void;
}

export const usePeriodStore = create<PeriodState>()(
  persist(
    (set) => ({
      period: DEFAULT_PERIOD,
      setPeriod: (period) => set({ period }),
      setPreset: (preset) => {
        if (preset === "custom") {
          set((state) => ({
            period: { preset: "custom", range: state.period.range },
          }));
          return;
        }
        set({
          period: { preset, range: resolveRangeFromPreset(preset) },
        });
      },
      setCustomRange: (range) =>
        set({ period: { preset: "custom", range } }),
    }),
    {
      name: "bethel_period",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
