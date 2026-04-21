import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "role_change"
  | string;

export interface AuditChanges {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  meta?: Record<string, unknown>;
}

export interface LogAuditInput {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  changes?: AuditChanges;
}

export interface AuditEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: AuditChanges | null;
  created_at: string;
}

export interface AuditFilters {
  entityType?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function logAudit(
  supabase: SupabaseClient,
  input: LogAuditInput
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      changes: input.changes ?? null,
    });
  } catch (error) {
    console.error("[AUDIT]", error);
  }
}

interface AuditRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: AuditChanges | null;
  created_at: string;
  user: { name: string | null; email: string | null } | null;
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAuditPaginated(
  supabase: SupabaseClient,
  filters: AuditFilters = {},
  page = 1,
  pageSize = 50
): Promise<AuditPage> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(200, Math.max(10, Math.floor(pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from("audit_logs")
    .select(
      `
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        changes,
        created_at,
        user:user_profiles!audit_logs_user_id_fkey(name, email)
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.from)
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to)
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);

  const { data, error, count } = await query.returns<AuditRow[]>();
  if (error) throw error;

  const entries: AuditEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_name: row.user?.name ?? null,
    user_email: row.user?.email ?? null,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    changes: row.changes,
    created_at: row.created_at,
  }));

  return {
    entries,
    total: count ?? entries.length,
    page: safePage,
    pageSize: safeSize,
  };
}

export async function listAudit(
  supabase: SupabaseClient,
  filters: AuditFilters = {}
): Promise<AuditEntry[]> {
  let query = supabase
    .from("audit_logs")
    .select(
      `
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        changes,
        created_at,
        user:user_profiles!audit_logs_user_id_fkey(name, email)
      `
    )
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  const { data, error } = await query.returns<AuditRow[]>();
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_name: row.user?.name ?? null,
    user_email: row.user?.email ?? null,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    changes: row.changes,
    created_at: row.created_at,
  }));
}

export async function listDistinctEntityTypes(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("entity_type")
    .order("entity_type", { ascending: true })
    .limit(500)
    .returns<{ entity_type: string }[]>();

  if (error || !data) return [];
  return Array.from(new Set(data.map((row) => row.entity_type)));
}
