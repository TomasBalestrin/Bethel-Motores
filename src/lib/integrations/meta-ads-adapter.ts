export interface MetaAdsCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  date_start: string;
  date_stop: string;
}

export interface FetchInsightsOptions {
  accountId: string;
  accessToken: string;
  datePreset?: "today" | "yesterday" | "last_7d" | "last_30d";
  graphVersion?: string;
}

const DEFAULT_VERSION = "v20.0";

interface GraphResponse<T> {
  data?: T[];
  paging?: { cursors?: { before?: string; after?: string } };
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    type?: string;
  };
}

interface InsightRow {
  campaign_id: string;
  campaign_name?: string;
  spend?: string;
  reach?: string;
  impressions?: string;
  clicks?: string;
  date_start?: string;
  date_stop?: string;
}

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class MetaAdsApiError extends Error {
  readonly status: number;
  readonly code: number | null;
  readonly fbTrace: string | null;

  constructor(params: {
    message: string;
    status: number;
    code?: number | null;
    fbTrace?: string | null;
  }) {
    super(params.message);
    this.name = "MetaAdsApiError";
    this.status = params.status;
    this.code = params.code ?? null;
    this.fbTrace = params.fbTrace ?? null;
  }
}

export async function fetchCampaignInsights(
  options: FetchInsightsOptions
): Promise<MetaAdsCampaignInsight[]> {
  const version = options.graphVersion ?? DEFAULT_VERSION;
  const preset = options.datePreset ?? "yesterday";
  const url = new URL(
    `https://graph.facebook.com/${version}/act_${options.accountId}/insights`
  );
  url.searchParams.set(
    "fields",
    "campaign_id,campaign_name,spend,reach,impressions,clicks,date_start,date_stop"
  );
  url.searchParams.set("level", "campaign");
  url.searchParams.set("date_preset", preset);
  url.searchParams.set("access_token", options.accessToken);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | GraphResponse<InsightRow>
    | null;

  if (!response.ok || body?.error) {
    throw new MetaAdsApiError({
      message:
        body?.error?.message ?? `Meta Graph API respondeu ${response.status}`,
      status: response.status,
      code: body?.error?.code ?? null,
      fbTrace: body?.error?.fbtrace_id ?? null,
    });
  }

  return (body?.data ?? []).map((row) => ({
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name ?? row.campaign_id,
    spend: toNumber(row.spend),
    reach: toNumber(row.reach),
    impressions: toNumber(row.impressions),
    clicks: toNumber(row.clicks),
    date_start: row.date_start ?? new Date().toISOString().slice(0, 10),
    date_stop: row.date_stop ?? new Date().toISOString().slice(0, 10),
  }));
}
