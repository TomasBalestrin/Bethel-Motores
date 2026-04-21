import Link from "next/link";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatCompactNumber } from "@/lib/utils/format";
import type { SocialProfileWithStats } from "@/services/social-profiles.service";

interface ProfileSelectionCardProps {
  profile: SocialProfileWithStats;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export function ProfileSelectionCard({ profile }: ProfileSelectionCardProps) {
  return (
    <Link
      href={`/motors/social-selling/${profile.slug}`}
      className={cn(
        "block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <Card className="flex flex-col items-center gap-3 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <Avatar className="h-16 w-16">
          {profile.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile.name} />
          ) : null}
          <AvatarFallback className="text-base">
            {initialsFrom(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-0.5">
          <h3 className="font-heading text-base font-semibold">{profile.name}</h3>
          {profile.instagram_handle ? (
            <p className="text-xs text-muted-foreground">
              {profile.instagram_handle}
            </p>
          ) : null}
        </div>
        <dl className="flex w-full justify-around text-xs">
          <div className="flex flex-col items-center">
            <dt className="text-muted-foreground">Seguidores</dt>
            <dd className="font-heading text-sm font-semibold tabular-nums">
              {profile.followers != null
                ? formatCompactNumber(profile.followers)
                : "—"}
            </dd>
          </div>
          <div className="flex flex-col items-center">
            <dt className="text-muted-foreground">Posts ativos</dt>
            <dd className="font-heading text-sm font-semibold tabular-nums">
              {profile.active_posts}
            </dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}
