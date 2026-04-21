"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  role: z.enum(USER_ROLES),
  name: z.string().trim().max(120).optional(),
});
type InviteInput = z.infer<typeof inviteSchema>;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  gestor_trafego: "Gestor de Tráfego",
  gestor_infra: "Gestor de Infra",
  copy: "Copy",
};

export function UserInviteModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "copy", name: "" },
  });

  async function onSubmit(input: InviteInput) {
    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email,
          role: input.role,
          name: input.name || undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao convidar"
        );
      }
      toast.success("Convite enviado", {
        description: `Magic link enviado para ${input.email}`,
      });
      form.reset({ email: "", role: "copy", name: "" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível convidar", { description: message });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Mail className="mr-1 h-4 w-4" />
          Convidar usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar novo usuário</DialogTitle>
          <DialogDescription>
            Um magic link será enviado por email. O usuário entra com a role
            que você definir agora.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              placeholder="usuario@bethel.com.br"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="invite-name">Nome (opcional)</Label>
            <Input
              id="invite-name"
              placeholder="Maria Silva"
              {...form.register("name")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(value) =>
                form.setValue("role", value as UserRole, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="invite-role">
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar convite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
