import type { DateRange, Period } from "@/types/common";

export interface RangeWithPrevious {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

function parseISODate(iso: string): Date {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return date;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function periodToRange(period: Period): RangeWithPrevious {
  return rangeToRangeWithPrevious(period.range);
}

export function rangeToRangeWithPrevious(range: DateRange): RangeWithPrevious {
  const from = parseISODate(range.from);
  const to = parseISODate(range.to);
  const days = diffDays(from, to);

  const previousTo = new Date(from);
  previousTo.setUTCDate(previousTo.getUTCDate() - 1);

  const previousFrom = new Date(previousTo);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - (days - 1));

  return {
    from: range.from,
    to: range.to,
    previousFrom: toISODate(previousFrom),
    previousTo: toISODate(previousTo),
  };
}

export function toRangeStartISO(dateIso: string): string {
  return `${dateIso}T00:00:00.000Z`;
}

export function toRangeEndISO(dateIso: string): string {
  return `${dateIso}T23:59:59.999Z`;
}
