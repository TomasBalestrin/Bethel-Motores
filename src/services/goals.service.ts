import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoalCreateInput, GoalScope, GoalUpdateInput } from "@/lib/validators/goal";
import { logAudit } from "@/services/audit.service";

export interface Goal {
  id: string;
  scope_type: GoalScope;
  motor_id: string | null;
  mentoria_id: string | null;
  metric_key: string;
  target_value: number;
  period_year: number;
  period_month: number;
  created_at: string;
  updated_at: string;
}

export interface GoalWithScope extends Goal {
  motor: { id: string; slug: string; name: string } | null;
  mentoria: { id: string; name: string } | null;
}

const GOAL_COLUMNS =
  "id, scope_type, motor_id, mentoria_id, metric_key, target_value, period_year, period_month, created_at, updated_at" as const;

const GOAL_WITH_SCOPE_SELECT = `
  id,
  scope_type,
  motor_id,
  mentoria_id,
  metric_key,
  target_value,
  period_year,
  period_month,
  created_at,
  updated_at,
  motor:motors!goals_motor_id_fkey(id, slug, name),
  mentoria:mentorias!goals_mentoria_id_fkey(id, name)
`;

export async function listGoals(
  supabase: SupabaseClient
): Promise<GoalWithScope[]> {
  const { data, error } = await supabase
    .from("goals")
    .select(GOAL_WITH_SCOPE_SELECT)
    .is("deleted_at", null)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .returns<GoalWithScope[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createGoal(
  supabase: SupabaseClient,
  input: GoalCreateInput,
  options: { actorId?: string } = {}
): Promise<{ id: string }> {
  const row = {
    scope_type: input.scope_type,
    motor_id: input.scope_type === "motor" ? input.motor_id ?? null : null,
    mentoria_id:
      input.scope_type === "mentoria" ? input.mentoria_id ?? null : null,
    metric_key: input.metric_key,
    target_value: input.target_value,
    period_year: input.period_year,
    period_month: input.period_month,
    created_by: options.actorId ?? null,
  };

  const { data, error } = await supabase
    .from("goals")
    .insert(row)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "create",
    entityType: "goal",
    entityId: data.id,
    changes: { after: row },
  });

  return data;
}

export async function updateGoal(
  supabase: SupabaseClient,
  id: string,
  patch: GoalUpdateInput,
  options: { actorId?: string } = {}
): Promise<{ id: string }> {
  const { data: before } = await supabase
    .from("goals")
    .select(GOAL_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<Goal>();

  const { data, error } = await supabase
    .from("goals")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "goal",
    entityId: id,
    changes: {
      before: before ? (before as unknown as Record<string, unknown>) : null,
      after: patch as Record<string, unknown>,
    },
  });

  return data;
}

export async function softDeleteGoal(
  supabase: SupabaseClient,
  id: string,
  options: { actorId?: string } = {}
): Promise<void> {
  const { data: before } = await supabase
    .from("goals")
    .select(GOAL_COLUMNS)
    .eq("id", id)
    .maybeSingle<Goal>();

  const { error } = await supabase
    .from("goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "delete",
    entityType: "goal",
    entityId: id,
    changes: {
      before: before ? (before as unknown as Record<string, unknown>) : null,
      after: null,
    },
  });
}

export interface ScopeFilter {
  motorId?: string;
  mentoriaId?: string;
}

export async function getGoalByScopeAndPeriod(
  supabase: SupabaseClient,
  options: {
    scope: GoalScope;
    motorId?: string | null;
    mentoriaId?: string | null;
    metricKey: string;
    periodYear: number;
    periodMonth: number;
  }
): Promise<Goal | null> {
  let query = supabase
    .from("goals")
    .select(GOAL_COLUMNS)
    .eq("scope_type", options.scope)
    .eq("metric_key", options.metricKey)
    .eq("period_year", options.periodYear)
    .eq("period_month", options.periodMonth)
    .is("deleted_at", null);

  if (options.scope === "motor") {
    if (!options.motorId) return null;
    query = query.eq("motor_id", options.motorId);
  } else {
    if (!options.mentoriaId) return null;
    query = query.eq("mentoria_id", options.mentoriaId);
  }

  const { data, error } = await query.maybeSingle<Goal>();
  if (error) return null;
  return data;
}
