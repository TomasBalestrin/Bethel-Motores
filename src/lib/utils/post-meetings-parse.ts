import Papa from "papaparse";

const MONTHS_PT: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseDatePT(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/\./g, "");
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2}|[a-zà-ü]{3,})$/);
  if (!match || !match[1] || !match[2]) return null;
  const day = Number(match[1]);
  const monthPart = match[2];
  let month: number;
  if (/^\d+$/.test(monthPart)) {
    month = Number(monthPart) - 1;
  } else {
    const key = monthPart.slice(0, 3);
    if (MONTHS_PT[key] === undefined) return null;
    month = MONTHS_PT[key];
  }
  if (day < 1 || day > 31 || month < 0 || month > 11) return null;

  const now = new Date();
  let year = now.getFullYear();
  let date = new Date(year, month, day);
  // Se a data virar mais que 30 dias no futuro, assume ano anterior
  if (date.getTime() > now.getTime() + 30 * 86_400_000) {
    year -= 1;
    date = new Date(year, month, day);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseMoneyBR(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parsePercent(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/%/g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return num / 100;
}

export function parseDurationSeconds(
  raw: string | null | undefined
): number | null {
  if (!raw) return null;
  const cleaned = String(raw).trim();
  if (/^[<>]/.test(cleaned)) return null; // "> 1:00" ou "<1:00" = ambíguo
  const match = cleaned.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return minutes * 60 + seconds;
}

export function extractInstagramShortcode(url: string): string | null {
  const m = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
}

export function parseYesNo(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const cleaned = raw.trim().toLowerCase().replace(/[?.,!]/g, "");
  return cleaned === "sim" || cleaned === "yes" || cleaned === "true" || cleaned === "s";
}

export function inferMeetingType(
  isoDate: string
): "terca" | "sexta" | null {
  // isoDate: YYYY-MM-DD
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  const dow = new Date(y, m - 1, d).getDay();
  if (dow === 2) return "terca";
  if (dow === 5) return "sexta";
  return null;
}

export type ImportedPostType = "impulsionar" | "organico";

export interface MeetingImportRow {
  link: string;
  shortcode: string | null;
  meeting_date: string; // ISO YYYY-MM-DD
  meeting_type: "terca" | "sexta";
  post_type: ImportedPostType;
  posted_at: string | null;
  investment: number | null;
  followers_gained: number | null;
  hook_rate_3s: number | null;
  hold_50: number | null;
  hold_75: number | null;
  duration_seconds: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  gancho: string | null;
  headline: string | null;
  assunto: string | null;
  pause_post: boolean;
  is_placeholder: boolean;
  row_number: number;
}

export interface MeetingImportParseResult {
  rows: MeetingImportRow[];
  errors: string[];
  unmappedHeaders: string[];
}

type FieldKey =
  | "meeting_date"
  | "posted_at"
  | "link"
  | "investment"
  | "followers_gained"
  | "hook_rate_3s"
  | "hold_50"
  | "hold_75"
  | "duration_seconds"
  | "reach"
  | "likes"
  | "comments"
  | "shares"
  | "gancho"
  | "headline"
  | "assunto"
  | "pause_post";

const HEADER_MAP: Array<{ tokens: string[]; key: FieldKey }> = [
  { tokens: ["data da analise", "data analise"], key: "meeting_date" },
  {
    tokens: ["data de postagem", "data postagem", "data do post"],
    key: "posted_at",
  },
  { tokens: ["link do post", "link", "url"], key: "link" },
  { tokens: ["investido", "investimento", "spend"], key: "investment" },
  { tokens: ["seguidores", "followers"], key: "followers_gained" },
  { tokens: ["hook rate 3s", "hook rate", "hook"], key: "hook_rate_3s" },
  { tokens: ["hold 50"], key: "hold_50" },
  { tokens: ["hold 75"], key: "hold_75" },
  { tokens: ["duracao"], key: "duration_seconds" },
  { tokens: ["alcance", "reach"], key: "reach" },
  { tokens: ["curtidas", "likes"], key: "likes" },
  { tokens: ["comentarios", "comments"], key: "comments" },
  {
    tokens: ["compartilhamentos", "compartilhamento", "shares"],
    key: "shares",
  },
  { tokens: ["gancho"], key: "gancho" },
  { tokens: ["headline"], key: "headline" },
  { tokens: ["assunto"], key: "assunto" },
  { tokens: ["cortar"], key: "pause_post" },
];

function mapHeader(raw: string): FieldKey | null {
  const normalized = normalizeHeader(raw);
  if (!normalized) return null;
  for (const entry of HEADER_MAP) {
    for (const token of entry.tokens) {
      if (normalized === token || normalized.startsWith(token + " ")) {
        return entry.key;
      }
    }
  }
  // Tenta includes como fallback
  for (const entry of HEADER_MAP) {
    for (const token of entry.tokens) {
      if (normalized.includes(token)) return entry.key;
    }
  }
  return null;
}

function stringOrNull(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

export function parseMeetingImportCsv(
  text: string
): MeetingImportParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const errors: string[] = parsed.errors
    .slice(0, 20)
    .map((err) => `Linha ${err.row ?? "?"}: ${err.message}`);

  const rawHeaders = parsed.meta.fields ?? [];
  const headerMap = new Map<string, FieldKey>();
  const unmapped: string[] = [];
  for (const header of rawHeaders) {
    const mapped = mapHeader(header);
    if (mapped) {
      headerMap.set(header, mapped);
    } else {
      unmapped.push(header);
    }
  }

  const rows: MeetingImportRow[] = [];
  const entries = Array.from(headerMap.entries());

  parsed.data.forEach((row, index) => {
    const values: Partial<Record<FieldKey, string>> = {};
    for (const [header, key] of entries) {
      const v = row[header];
      if (v !== undefined) values[key] = v;
    }

    const rawLink = stringOrNull(values.link);
    if (!rawLink || !/^https?:\/\//i.test(rawLink)) {
      errors.push(`Linha ${index + 2}: link ausente ou inválido`);
      return;
    }

    const meetingDate = parseDatePT(values.meeting_date);
    if (!meetingDate) {
      errors.push(
        `Linha ${index + 2}: "Data da Análise" inválida (${values.meeting_date ?? "vazia"})`
      );
      return;
    }

    const meetingType = inferMeetingType(meetingDate);
    if (!meetingType) {
      errors.push(
        `Linha ${index + 2}: data ${meetingDate} não é terça nem sexta`
      );
      return;
    }

    function parseIntOrNull(raw: string | undefined): number | null {
      if (!raw) return null;
      const n = Number(raw.replace(/[^\d-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }

    const investment = parseMoneyBR(values.investment);
    const followers = parseIntOrNull(values.followers_gained);
    const hookRate = parsePercent(values.hook_rate_3s);
    const hold50 = parsePercent(values.hold_50);
    const hold75 = parsePercent(values.hold_75);
    const duration = parseDurationSeconds(values.duration_seconds);
    const reach = parseIntOrNull(values.reach);
    const likes = parseIntOrNull(values.likes);
    const comments = parseIntOrNull(values.comments);
    const shares = parseIntOrNull(values.shares);
    const gancho = stringOrNull(values.gancho);
    const headline = stringOrNull(values.headline);
    const assunto = stringOrNull(values.assunto);
    const pausePost = parseYesNo(values.pause_post);
    const postedAt = parseDatePT(values.posted_at);

    // Detectar post_type: impulsionar se tem métricas pagas (investimento,
    // hook rate, hold) / orgânico se tem métricas orgânicas (alcance,
    // curtidas, comentários, shares). Default: impulsionar.
    const hasImpulsionarMetrics =
      investment !== null ||
      hookRate !== null ||
      hold50 !== null ||
      hold75 !== null;
    const hasOrganicoMetrics =
      reach !== null ||
      likes !== null ||
      comments !== null ||
      shares !== null;

    let postType: ImportedPostType;
    if (hasImpulsionarMetrics && !hasOrganicoMetrics) {
      postType = "impulsionar";
    } else if (hasOrganicoMetrics && !hasImpulsionarMetrics) {
      postType = "organico";
    } else if (hasImpulsionarMetrics && hasOrganicoMetrics) {
      // Ambíguo — ganha quem tem mais campos preenchidos
      const impCount = [investment, hookRate, hold50, hold75].filter(
        (v) => v !== null
      ).length;
      const orgCount = [reach, likes, comments, shares].filter(
        (v) => v !== null
      ).length;
      postType = impCount >= orgCount ? "impulsionar" : "organico";
    } else {
      // Placeholder sem métricas — fallback default
      postType = "impulsionar";
    }

    const hasAnyMetric =
      investment !== null ||
      (followers !== null && Number.isFinite(followers) && followers !== 0) ||
      hookRate !== null ||
      hold50 !== null ||
      hold75 !== null ||
      duration !== null ||
      reach !== null ||
      likes !== null ||
      comments !== null ||
      shares !== null ||
      gancho !== null ||
      headline !== null ||
      assunto !== null;

    rows.push({
      link: rawLink,
      shortcode: extractInstagramShortcode(rawLink),
      meeting_date: meetingDate,
      meeting_type: meetingType,
      post_type: postType,
      posted_at: postedAt,
      investment,
      followers_gained:
        followers !== null && Number.isFinite(followers) ? followers : null,
      hook_rate_3s: hookRate,
      hold_50: hold50,
      hold_75: hold75,
      duration_seconds: duration,
      reach,
      likes,
      comments,
      shares,
      gancho,
      headline,
      assunto,
      pause_post: pausePost,
      is_placeholder: !hasAnyMetric,
      row_number: index + 2,
    });
  });

  return { rows, errors, unmappedHeaders: unmapped };
}
