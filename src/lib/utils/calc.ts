export function calcPercent(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  fractionDigits = 1
): number {
  if (!numerator || !denominator) return 0;
  if (denominator === 0) return 0;
  const ratio = (numerator / denominator) * 100;
  if (!Number.isFinite(ratio)) return 0;
  const factor = 10 ** fractionDigits;
  return Math.round(ratio * factor) / factor;
}

export interface DeltaResult {
  value: number;
  direction: "up" | "down" | "flat";
}

export function calcDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  fractionDigits = 1
): DeltaResult {
  const curr = current ?? 0;
  const prev = previous ?? 0;

  if (prev === 0) {
    if (curr === 0) return { value: 0, direction: "flat" };
    return { value: 100, direction: "up" };
  }

  const diff = ((curr - prev) / Math.abs(prev)) * 100;
  const factor = 10 ** fractionDigits;
  const rounded = Math.round(diff * factor) / factor;

  const direction: DeltaResult["direction"] =
    rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";

  return { value: rounded, direction };
}
