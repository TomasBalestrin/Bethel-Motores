"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MentoriaWithMetrics } from "@/types/mentoria";

interface CompareSelectorProps {
  mentorias: MentoriaWithMetrics[];
  selectedIds: string[];
  maxItems?: number;
  onChange: (ids: string[]) => void;
}

export function CompareSelector({
  mentorias,
  selectedIds,
  maxItems = 4,
  onChange,
}: CompareSelectorProps) {
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => mentorias.find((m) => m.id === id))
        .filter((m): m is MentoriaWithMetrics => Boolean(m)),
    [selectedIds, mentorias]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return mentorias;
    return mentorias.filter((m) => m.name.toLowerCase().includes(term));
  }, [mentorias, query]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }
    if (selectedIds.length >= maxItems) return;
    onChange([...selectedIds, id]);
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Mentorias selecionadas</p>
        <span className="text-xs text-muted-foreground">
          {selected.length}/{maxItems} (a primeira é a base)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Selecione no mínimo 2 mentorias para comparar.
          </span>
        ) : (
          selected.map((mentoria, index) => (
            <Badge
              key={mentoria.id}
              variant="outline"
              className={cn(
                "flex items-center gap-1 rounded-full border-primary/30 bg-primary/10 text-xs text-primary",
                index === 0 && "border-primary bg-primary/20"
              )}
            >
              {index === 0 ? <span className="font-semibold">Base</span> : null}
              <span className="truncate max-w-[160px]">{mentoria.name}</span>
              <button
                type="button"
                aria-label={`Remover ${mentoria.name}`}
                onClick={() => toggle(mentoria.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar mentoria..."
            className="pl-8"
          />
        </div>

        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-xs text-muted-foreground">
              Nada encontrado.
            </li>
          ) : (
            filtered.map((mentoria) => {
              const isSelected = selectedIds.includes(mentoria.id);
              const disabled =
                !isSelected && selectedIds.length >= maxItems;
              return (
                <li key={mentoria.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(mentoria.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition-colors",
                      "hover:bg-muted",
                      isSelected && "bg-primary/10 text-primary",
                      disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <span className="truncate">{mentoria.name}</span>
                    {isSelected ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {selected.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange([])}
            className="text-xs"
          >
            Limpar seleção
          </Button>
        ) : null}
      </div>
    </div>
  );
}
