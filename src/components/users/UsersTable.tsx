"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/user";
import { UserRoleInlineEdit } from "./UserRoleInlineEdit";

interface UsersTableProps {
  users: UserProfile[];
  currentUserId: string | null;
}

function initialsFrom(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase() || "?";
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<UserProfile | null>(null);

  if (users.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum usuário cadastrado.
      </p>
    );
  }

  async function toggleActive(target: UserProfile) {
    setPendingId(target.id);
    try {
      const response = await fetch(`/api/users/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !target.is_active }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao atualizar"
        );
      }
      toast.success(target.is_active ? "Usuário desativado" : "Usuário reativado");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível atualizar", { description: message });
    } finally {
      setPendingId(null);
      setConfirmTarget(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const initials = initialsFrom(user.name, user.email);
              const isPending = pendingId === user.id;

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {user.avatar_url ? (
                          <AvatarImage
                            src={user.avatar_url}
                            alt={user.name ?? user.email}
                          />
                        ) : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.name ?? "—"}
                          {isSelf ? (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              (você)
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <UserRoleInlineEdit
                      userId={user.id}
                      currentRole={user.role}
                      disabled={isSelf}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border text-[10px]",
                        user.is_active
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {user.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmTarget(user)}
                      disabled={isPending || isSelf}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Power
                          className={cn(
                            "h-4 w-4",
                            user.is_active
                              ? "text-destructive"
                              : "text-success"
                          )}
                        />
                      )}
                      <span className="ml-1">
                        {user.is_active ? "Desativar" : "Reativar"}
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.is_active ? "Desativar usuário?" : "Reativar usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.is_active
                ? `${confirmTarget?.name ?? confirmTarget?.email} perderá acesso imediatamente. Você pode reativar depois.`
                : `${confirmTarget?.name ?? confirmTarget?.email} terá acesso restaurado com a mesma role.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (confirmTarget) void toggleActive(confirmTarget);
              }}
            >
              {confirmTarget?.is_active ? "Desativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
