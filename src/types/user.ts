import type { UserRole } from "@/lib/auth/roles";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
}
