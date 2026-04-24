import Papa from "papaparse";

import type { LeadCreateInput } from "@/lib/validators/lead";
import type { AttendanceEntry } from "@/services/leads.service";
import { normalizePhone } from "@/lib/utils/matching";

/**
 * Lê um File como texto detectando encoding automaticamente.
 * Tenta UTF-8 primeiro; se houver caracteres de substituição (U+FFFD),
 * relê como Windows-1252 (padrão de exportação do Excel brasileiro).
 */
export async function readFileText(file: File): Promise<string> {
  const utf8 = await file.text();
  if (!utf8.includes("�")) return utf8;
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = reject;
    reader.readAsText(file, "windows-1252");
  });
}

type LeadHeaderKey = "name" | "phone" | "instagram_handle" | "revenue" | "niche";

// Match exato (rápido) depois de remover acentos/pontuação e lower.
const HEADER_SYNONYMS: Record<string, LeadHeaderKey> = {
  nome: "name",
  name: "name",
  fullname: "name",
  telefone: "phone",
  phone: "phone",
  celular: "phone",
  whatsapp: "phone",
  instagram: "instagram_handle",
  ig: "instagram_handle",
  arroba: "instagram_handle",
  user: "instagram_handle",
  usuario: "instagram_handle",
  handle: "instagram_handle",
  faturamento: "revenue",
  revenue: "revenue",
  receita: "revenue",
  nicho: "niche",
  niche: "niche",
  segmento: "niche",
};

// Fallback: se o cabeçalho for uma pergunta completa (Google Forms tipo
// "Qual é o seu nome completo?"), procuramos tokens por prioridade.
// Ordem importa: tokens mais específicos primeiro.
const HEADER_PATTERNS: { tokens: string[]; key: LeadHeaderKey }[] = [
  { tokens: ["whatsapp", "telefone", "celular", "phone"], key: "phone" },
  { tokens: ["instagram", "perfil do ig"], key: "instagram_handle" },
  { tokens: ["faturamento", "receita", "revenue"], key: "revenue" },
  { tokens: ["nicho", "niche", "segmento"], key: "niche" },
  { tokens: ["nome completo", "nome", "name", "fullname"], key: "name" },
  { tokens: ["handle", "usuario", "user"], key: "instagram_handle" },
];

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapHeader(raw: string): LeadHeaderKey | null {
  const normalized = normalizeHeader(raw);
  if (!normalized) return null;
  const compact = normalized.replace(/\s+/g, "");
  const exact = HEADER_SYNONYMS[compact];
  if (exact) return exact;
  for (const group of HEADER_PATTERNS) {
    for (const token of group.tokens) {
      if (normalized.includes(token)) return group.key;
    }
  }
  return null;
}

function normalizeRevenue(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[R$\s ]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface ParseResult {
  leads: LeadCreateInput[];
  errors: string[];
  unmappedHeaders: string[];
}

export function parseLeadsFromCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const errors: string[] = parsed.errors
    .slice(0, 20)
    .map((err) => `Linha ${err.row ?? "?"}: ${err.message}`);

  const rawHeaders = parsed.meta.fields ?? [];
  const headerMap = new Map<string, LeadHeaderKey>();
  const unmapped: string[] = [];

  for (const header of rawHeaders) {
    const mapped = mapHeader(header);
    if (mapped) {
      if (!Array.from(headerMap.values()).includes(mapped)) {
        headerMap.set(header, mapped);
      } else {
        // cabeçalho duplicado pra mesma chave — ignoramos o segundo
        unmapped.push(header);
      }
    } else {
      unmapped.push(header);
    }
  }

  const entries = Array.from(headerMap.entries());
  const leads: LeadCreateInput[] = [];
  for (const row of parsed.data) {
    let name = "";
    let phone: string | null = null;
    let instagram: string | null = null;
    let niche: string | null = null;
    let revenue: number | null = null;
    for (const [raw, key] of entries) {
      const value = row[raw];
      if (key === "revenue") {
        revenue = value ? normalizeRevenue(value) : null;
      } else if (key === "name") {
        name = normalizeText(value) ?? "";
      } else if (key === "phone") {
        phone = normalizePhone(value);
      } else if (key === "instagram_handle") {
        instagram = normalizeText(value);
      } else if (key === "niche") {
        niche = normalizeText(value);
      }
    }
    if (!name) continue;
    leads.push({
      name,
      phone,
      instagram_handle: instagram,
      revenue,
      niche,
      joined_group: false,
      confirmed_presence: false,
      attended: false,
      scheduled: false,
      sold: false,
      is_qualified: false,
      sale_value: null,
      entry_value: null,
    });
  }

  return { leads, errors, unmappedHeaders: unmapped };
}

function extractSheetId(input: string): { id: string; gid: string } | null {
  const idMatch = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch || !idMatch[1]) return null;
  const gidMatch = input.match(/[#&?]gid=(\d+)/);
  return { id: idMatch[1], gid: gidMatch?.[1] ?? "0" };
}

export function buildSheetsCsvUrl(sheetUrl: string): string | null {
  const extracted = extractSheetId(sheetUrl);
  if (!extracted) return null;
  return `https://docs.google.com/spreadsheets/d/${extracted.id}/export?format=csv&gid=${extracted.gid}`;
}

export async function fetchSheetAsCsv(sheetUrl: string): Promise<string> {
  const csvUrl = buildSheetsCsvUrl(sheetUrl);
  if (!csvUrl) {
    throw new Error("URL de planilha inválida — verifique o link");
  }
  const response = await fetch(csvUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(
      "Não foi possível baixar a planilha — garanta que está como 'qualquer um com o link pode visualizar'"
    );
  }
  return await response.text();
}

export interface AttendanceParseResult {
  entries: AttendanceEntry[];
  errors: string[];
  unmappedHeaders: string[];
}

export function parseAttendanceFromCsv(text: string): AttendanceParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const errors: string[] = parsed.errors
    .slice(0, 20)
    .map((err) => `Linha ${err.row ?? "?"}: ${err.message}`);

  const rawHeaders = parsed.meta.fields ?? [];
  const headerMap = new Map<string, "name" | "phone" | "instagram_handle">();
  const unmapped: string[] = [];

  for (const header of rawHeaders) {
    const mapped = mapHeader(header);
    if (mapped === "name" || mapped === "phone" || mapped === "instagram_handle") {
      if (!Array.from(headerMap.values()).includes(mapped)) {
        headerMap.set(header, mapped);
      } else {
        unmapped.push(header);
      }
    } else {
      unmapped.push(header);
    }
  }

  const entries: AttendanceEntry[] = [];
  const mapEntries = Array.from(headerMap.entries());
  for (const row of parsed.data) {
    let name: string | null = null;
    let phone: string | null = null;
    let instagram: string | null = null;
    for (const [raw, key] of mapEntries) {
      const value = row[raw];
      if (key === "phone") {
        const p = normalizePhone(value);
        if (p) phone = p;
      } else {
        const text = normalizeText(value);
        if (!text) continue;
        if (key === "name") name = text;
        else if (key === "instagram_handle") instagram = text;
      }
    }
    if (!name && !phone && !instagram) continue;
    entries.push({ name, phone, instagram_handle: instagram });
  }

  return { entries, errors, unmappedHeaders: unmapped };
}
