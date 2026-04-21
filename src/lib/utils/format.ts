import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CURRENCY_BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const COMPACT_BR = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return CURRENCY_BRL.format(0);
  return CURRENCY_BRL.format(value);
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value == null || Number.isNaN(value)) return "0%";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  return COMPACT_BR.format(value);
}

export function formatInteger(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  return Math.round(value).toLocaleString("pt-BR");
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateBR(value: Date | string | number | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTimeBR(
  value: Date | string | number | null | undefined
): string {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
}
