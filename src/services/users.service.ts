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
  password?: string;
}

function generatePassword(length = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export interface InviteUserResult {
  userId: string;
  email: string;
  password: string;
}

export async function inviteUser(
  admin: SupabaseClient,
  input: InviteUserInput
): Promise<InviteUserResult> {
  const password = input.password ?? generatePassword(16);
  const fallbackName = input.email.split("@")[0] ?? input.email;
  const name = input.name?.trim() || fallbackName;

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: {
      role: input.role,
      name,
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("Convite não gerou usuário");

  const userId = data.user.id;

  await admin.from("user_profiles").upsert(
    {
      id: userId,
      email: data.user.email ?? input.email,
      name,
      role: input.role,
      is_active: true,
    },
    { onConflict: "id" }
  );

  return {
    userId,
    email: data.user.email ?? input.email,
    password,
  };
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

export interface SelfProfilePatch {
  name?: string | null;
  avatar_url?: string | null;
}

export async function updateOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: SelfProfilePatch
): Promise<UserProfile> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.avatar_url !== undefined) update.avatar_url = patch.avatar_url;

  const { data, error } = await supabase
    .from("user_profiles")
    .update(update)
    .eq("id", userId)
    .select(USER_PROFILE_COLUMNS)
    .single<UserProfile>();

  if (error) throw error;

  await logAudit(supabase, {
    userId,
    action: "update",
    entityType: "user_profile",
    entityId: userId,
    changes: { after: update, meta: { self: true } },
  });

  return data;
}

export async function updateOwnPassword(
  supabase: SupabaseClient,
  newPassword: string
): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
