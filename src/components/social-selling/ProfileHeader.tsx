import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { SocialProfileSummary } from "@/services/social-profiles.service";

interface ProfileHeaderProps {
  profile: SocialProfileSummary;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <header className="flex items-center gap-4">
      <Avatar className="h-14 w-14">
        {profile.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt={profile.name} />
        ) : null}
        <AvatarFallback className="text-base">
          {initialsFrom(profile.name)}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {profile.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {profile.instagram_handle ? (
            <span>{profile.instagram_handle}</span>
          ) : null}
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border text-[10px]",
              profile.is_active
                ? "border-success/30 bg-success/10 text-success"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            {profile.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </div>
    </header>
  );
}
