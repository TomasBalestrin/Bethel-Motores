import Papa from "papaparse";

import type { LeadCreateInput } from "@/lib/validators/lead";

const HEADER_SYNONYMS: Record<string, keyof LeadCreateInput> = {
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

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
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
  const headerMap = new Map<string, keyof LeadCreateInput>();
  const unmapped: string[] = [];

  for (const header of rawHeaders) {
    const key = normalizeHeader(header);
    const mapped = HEADER_SYNONYMS[key];
    if (mapped) headerMap.set(header, mapped);
    else unmapped.push(header);
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
        phone = normalizeText(value);
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
