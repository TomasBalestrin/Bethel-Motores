import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getProfileBySlug } from "@/services/social-profiles.service";
import { ProfileHeader } from "@/components/social-selling/ProfileHeader";
import { ProfileTabs } from "@/components/social-selling/ProfileTabs";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
  params: { profileSlug: string };
}

export default async function SocialProfileLayout({
  children,
  params,
}: LayoutProps) {
  const supabase = await createClient();
  const profile = await getProfileBySlug(supabase, params.profileSlug);
  if (!profile) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <ProfileHeader profile={profile} />
      <ProfileTabs profileSlug={profile.slug} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
