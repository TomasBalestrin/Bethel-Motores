import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth/roles";

export interface RoleCheckResult {
  ok: boolean;
  role?: UserRole;
  error?: string;
}

export async function assertRole(
  supabase: SupabaseClient,
  userId: string,
  allowedRoles: readonly UserRole[]
): Promise<RoleCheckResult> {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle<{ role: UserRole; is_active: boolean }>();

  if (error || !profile) {
    return { ok: false, error: "Perfil não encontrado" };
  }

  if (!profile.is_active) {
    return { ok: false, role: profile.role, error: "Usuário inativo" };
  }

  if (!allowedRoles.includes(profile.role)) {
    return {
      ok: false,
      role: profile.role,
      error: "Permissão insuficiente",
    };
  }

  return { ok: true, role: profile.role };
}
