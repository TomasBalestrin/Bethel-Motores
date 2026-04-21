import type { SupabaseClient } from "@supabase/supabase-js";
import type { Motor, MotorStats, MotorWithStats } from "@/types/motor";

const MOTOR_COLUMNS =
  "id, slug, name, description, icon, display_order" as const;

export async function listActiveMotors(
  supabase: SupabaseClient
): Promise<MotorWithStats[]> {
  const { data, error } = await supabase
    .from("motors")
    .select(MOTOR_COLUMNS)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("display_order", { ascending: true })
    .returns<Motor[]>();

  if (error) throw error;
  const motors = data ?? [];

  const withStats = await Promise.all(
    motors.map(async (motor) => ({
      ...motor,
      stats: await getMotorStats(supabase, motor.slug),
    }))
  );

  return withStats;
}

async function getMotorStats(
  supabase: SupabaseClient,
  slug: string
): Promise<MotorStats> {
  if (slug === "mentorias") {
    const { count } = await supabase
      .from("mentorias")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    const value = count ?? 0;
    return {
      activeCount: value,
      label: value === 1 ? "1 mentoria cadastrada" : `${value} mentorias cadastradas`,
    };
  }

  if (slug === "social-selling") {
    const { count } = await supabase
      .from("social_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("deleted_at", null);

    const value = count ?? 0;
    return {
      activeCount: value,
      label: value === 1 ? "1 perfil ativo" : `${value} perfis ativos`,
    };
  }

  return { activeCount: 0, label: "Sem estatísticas" };
}
