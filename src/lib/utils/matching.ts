export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

function phoneKey(raw: string | null | undefined): string | null {
  const digits = normalizePhone(raw);
  if (!digits) return null;
  // Usa os últimos 11 dígitos como chave para tolerar DDI 55 opcional
  // (ex: "5511999990001" e "11999990001" viram a mesma chave).
  return digits.slice(-11);
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = phoneKey(a);
  const kb = phoneKey(b);
  if (!ka || !kb) return false;
  return ka === kb;
}

export function phoneIndexKey(raw: string | null | undefined): string | null {
  return phoneKey(raw);
}

export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).trim().toLowerCase().replace(/^@+/, "");
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}
