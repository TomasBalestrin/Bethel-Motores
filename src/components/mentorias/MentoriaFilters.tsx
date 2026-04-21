"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluídas" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigas" },
  { value: "top_revenue", label: "Maior faturamento" },
];

export function MentoriaFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("query") ?? "";
  const status = searchParams.get("status") ?? "all";
  const sort = searchParams.get("sort") ?? "recent";

  const [searchText, setSearchText] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchText(initialQuery);
  }, [initialQuery]);

  function pushParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleSearchChange(value: string) {
    setSearchText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ query: value.trim() || null });
    }, 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-sm sm:w-72">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchText}
          placeholder="Buscar mentoria..."
          aria-label="Buscar mentoria"
          className="pl-8"
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Select
        value={status}
        onValueChange={(value) =>
          pushParams({ status: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sort}
        onValueChange={(value) =>
          pushParams({ sort: value === "recent" ? null : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
