import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth/roles";
import type { UserProfile } from "@/types/user";
import { logAudit } from "@/services/audit.service";

const USER_PROFILE_COLUMNS =
  "id, email, name, role, is_active, avatar_url" as const;

export async function listUsers(supabase: SupabaseClient): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(USER_PROFILE_COLUMNS)
    .order("name", { ascending: true, nullsFirst: false })
    .returns<UserProfile[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(USER_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<UserProfile>();

  if (error) throw error;
  return data;
}

export interface InviteUserInput {
  email: string;
  role: UserRole;
  name?: string;
}

export async function inviteUser(
  admin: SupabaseClient,
  input: InviteUserInput
): Promise<{ userId: string; email: string }> {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: {
      role: input.role,
      name: input.name ?? null,
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("Convite não gerou usuário");

  return { userId: data.user.id, email: data.user.email ?? input.email };
}

export async function updateUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
  options: { actorId?: string } = {}
): Promise<UserProfile> {
  const { data: before } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: UserRole }>();

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ role })
    .eq("id", userId)
    .select(USER_PROFILE_COLUMNS)
    .single<UserProfile>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "role_change",
    entityType: "user_profile",
    entityId: userId,
    changes: {
      before: { role: before?.role ?? null },
      after: { role },
    },
  });

  return data;
}

export async function deactivateUser(
  supabase: SupabaseClient,
  userId: string,
  options: { actorId?: string } = {}
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ is_active: false })
    .eq("id", userId)
    .select(USER_PROFILE_COLUMNS)
    .single<UserProfile>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "user_profile",
    entityId: userId,
    changes: { after: { is_active: false } },
  });

  return data;
}

export async function reactivateUser(
  supabase: SupabaseClient,
  userId: string,
  options: { actorId?: string } = {}
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ is_active: true })
    .eq("id", userId)
    .select(USER_PROFILE_COLUMNS)
    .single<UserProfile>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "user_profile",
    entityId: userId,
    changes: { after: { is_active: true } },
  });

  return data;
}
