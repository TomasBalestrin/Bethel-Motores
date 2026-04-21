import type { SupabaseClient } from "@supabase/supabase-js";
import type { Motor, MotorStats, MotorWithStats } from "@/types/motor";

const MOTOR_COLUMNS =
  "id, slug, name, description, icon, display_order" as const;

function statsForSlug(
  slug: string,
  counts: { mentorias: number; socialProfiles: number }
): MotorStats {
  if (slug === "mentorias") {
    const value = counts.mentorias;
    return {
      activeCount: value,
      label: value === 1 ? "1 mentoria cadastrada" : `${value} mentorias cadastradas`,
    };
  }
  if (slug === "social-selling") {
    const value = counts.socialProfiles;
    return {
      activeCount: value,
      label: value === 1 ? "1 perfil ativo" : `${value} perfis ativos`,
    };
  }
  return { activeCount: 0, label: "Sem estatísticas" };
}

export async function listActiveMotors(
  supabase: SupabaseClient
): Promise<MotorWithStats[]> {
  const [motorsResult, mentoriasCount, socialCount] = await Promise.all([
    supabase
      .from("motors")
      .select(MOTOR_COLUMNS)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .returns<Motor[]>(),
    supabase
      .from("mentorias")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("social_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);

  if (motorsResult.error) throw motorsResult.error;
  const motors = motorsResult.data ?? [];

  const counts = {
    mentorias: mentoriasCount.count ?? 0,
    socialProfiles: socialCount.count ?? 0,
  };

  return motors.map((motor) => ({
    ...motor,
    stats: statsForSlug(motor.slug, counts),
  }));
}
