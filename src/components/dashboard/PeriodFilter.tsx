"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";

import {
  DEFAULT_PERIOD,
  resolveRangeFromPreset,
  usePeriodStore,
} from "@/stores/periodStore";
import type { DateRange, PeriodPreset } from "@/types/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "month", label: "Mês atual" },
  { value: "custom", label: "Personalizado" },
];

function pushPeriodToUrl(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: URLSearchParams,
  preset: PeriodPreset,
  range: DateRange
) {
  const next = new URLSearchParams(searchParams);
  next.set("period", preset);
  next.set("from", range.from);
  next.set("to", range.to);
  router.replace(`${pathname}?${next.toString()}`, { scroll: false });
}

export function PeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = usePeriodStore((s) => s.period);
  const setPreset = usePeriodStore((s) => s.setPreset);
  const setCustomRange = usePeriodStore((s) => s.setCustomRange);

  const [customFrom, setCustomFrom] = useState(period.range.from);
  const [customTo, setCustomTo] = useState(period.range.to);

  useEffect(() => {
    const urlPreset = searchParams.get("period") as PeriodPreset | null;
    if (!urlPreset || urlPreset === period.preset) return;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (urlPreset === "custom" && from && to) {
      setCustomRange({ from, to });
      setCustomFrom(from);
      setCustomTo(to);
    } else if (urlPreset !== "custom") {
      setPreset(urlPreset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePresetChange(value: string) {
    const preset = value as PeriodPreset;
    if (preset === "custom") {
      setPreset("custom");
      return;
    }
    const range = resolveRangeFromPreset(preset);
    setPreset(preset);
    pushPeriodToUrl(
      router,
      pathname,
      new URLSearchParams(searchParams.toString()),
      preset,
      range
    );
  }

  function handleApplyCustom() {
    if (!customFrom || !customTo) return;
    const range: DateRange = { from: customFrom, to: customTo };
    setCustomRange(range);
    pushPeriodToUrl(
      router,
      pathname,
      new URLSearchParams(searchParams.toString()),
      "custom",
      range
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period.preset === "custom" ? (
        <div className="flex items-end gap-2 rounded-md border border-border bg-card p-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="period-from" className="text-xs">
              De
            </Label>
            <Input
              id="period-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              max={customTo || undefined}
              className="h-8 w-[140px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="period-to" className="text-xs">
              Até
            </Label>
            <Input
              id="period-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              min={customFrom || undefined}
              className="h-8 w-[140px]"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApplyCustom}
            disabled={!customFrom || !customTo || customFrom > customTo}
          >
            Aplicar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

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
