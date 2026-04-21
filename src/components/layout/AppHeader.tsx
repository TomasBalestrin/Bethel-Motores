"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Breadcrumbs } from "./Breadcrumbs";

function initialsFrom(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase() || "?";
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function AppHeader() {
  const router = useRouter();
  const { user, profile } = useUser();

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair", { description: error.message });
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  const displayName = profile?.name ?? user?.email ?? "Usuário";
  const email = profile?.email ?? user?.email ?? null;
  const initials = initialsFrom(profile?.name ?? null, email);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <Breadcrumbs />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label="Menu do usuário"
          >
            <Avatar className="h-9 w-9">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="truncate text-sm font-medium">{displayName}</span>
              {email ? (
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              ) : null}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/profile" className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void handleLogout();
            }}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
