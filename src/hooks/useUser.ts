"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/user";

export type { UserProfile };

export interface UseUserResult {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

export function useUser(): UseUserResult {
  const query = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return { user: null, profile: null };

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, email, name, role, is_active, avatar_url")
        .eq("id", user.id)
        .maybeSingle<UserProfile>();

      return { user, profile: profile ?? null };
    },
    staleTime: 60_000,
  });

  return {
    user: query.data?.user ?? null,
    profile: query.data?.profile ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
