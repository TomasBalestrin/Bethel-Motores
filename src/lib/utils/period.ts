import { DEFAULT_PERIOD, resolveRangeFromPreset } from "@/stores/periodStore";
import type { PeriodPreset } from "@/types/common";

export interface PeriodSearchParams {
  period?: string;
  from?: string;
  to?: string;
}

export function resolvePeriodFromSearchParams(params: PeriodSearchParams) {
  const preset = (params.period ?? DEFAULT_PERIOD.preset) as PeriodPreset;
  const validPresets: PeriodPreset[] = ["7d", "30d", "90d", "month", "custom"];
  if (!validPresets.includes(preset)) return DEFAULT_PERIOD;
  if (preset === "custom") {
    if (params.from && params.to) {
      return { preset, range: { from: params.from, to: params.to } };
    }
    return DEFAULT_PERIOD;
  }
  return { preset, range: resolveRangeFromPreset(preset) };
}
