"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";

interface UserRoleInlineEditProps {
  userId: string;
  currentRole: UserRole;
  disabled?: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  gestor_trafego: "Gestor de Tráfego",
  gestor_infra: "Gestor de Infra",
  copy: "Copy",
};

export function UserRoleInlineEdit({
  userId,
  currentRole,
  disabled,
}: UserRoleInlineEditProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<UserRole>(currentRole);

  function handleChange(next: string) {
    const role = next as UserRole;
    if (role === optimistic) return;
    const previous = optimistic;
    setOptimistic(role);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "Erro ao atualizar role"
          );
        }
        toast.success("Role atualizada");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro desconhecido";
        toast.error("Não foi possível atualizar", { description: message });
        setOptimistic(previous);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={optimistic}
        onValueChange={handleChange}
        disabled={disabled || pending}
      >
        <SelectTrigger className="h-8 w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USER_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
    </div>
  );
}
