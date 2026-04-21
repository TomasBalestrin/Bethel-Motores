import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth/roles";
import type { UserProfile } from "@/types/user";

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
  role: UserRole
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ role })
    .eq("id", userId)
    .select(USER_PROFILE_COLUMNS)
    .single<UserProfile>();

  if (error) throw error;
  return data;
}

export async function deactivateUser(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ is_active: false })
    .eq("id", userId)
    .select(USER_PROFILE_COLUMNS)
    .single<UserProfile>();

  if (error) throw error;
  return data;
}
