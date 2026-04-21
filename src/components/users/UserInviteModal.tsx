"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, KeyRound, Loader2, UserPlus } from "lucide-react";
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
  password: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .pipe(z.string().min(8).max(72).optional())
    .optional(),
});
type InviteInput = z.infer<typeof inviteSchema>;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  gestor_trafego: "Gestor de Tráfego",
  gestor_infra: "Gestor de Infra",
  copy: "Copy",
};

interface CreatedCredentials {
  email: string;
  password: string;
}

export function UserInviteModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "copy", name: "", password: "" },
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
          password: input.password || undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao criar usuário"
        );
      }
      const payload = (await response.json()) as {
        data: { userId: string; email: string; password: string };
      };
      setCredentials({
        email: payload.data.email,
        password: payload.data.password,
      });
      toast.success("Usuário criado");
      form.reset({ email: "", role: "copy", name: "", password: "" });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível criar", { description: message });
    }
  }

  async function copyCredentials() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${credentials.email}\nSenha: ${credentials.password}`
      );
      setCopied(true);
      toast.success("Copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) {
      setCredentials(null);
      setCopied(false);
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-1 h-4 w-4" />
          Convidar usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-warning" />
                Compartilhe estas credenciais
              </DialogTitle>
              <DialogDescription>
                Esta é a única vez que a senha será exibida. Passe por um canal
                seguro — o usuário pode trocar depois em Perfil.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input readOnly value={credentials.email} className="font-mono text-xs" />
              </div>
              <div className="space-y-1">
                <Label>Senha</Label>
                <Input
                  readOnly
                  value={credentials.password}
                  className="font-mono text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
              <Button type="button" onClick={copyCredentials} className="w-full">
                {copied ? (
                  <Check className="mr-1 h-4 w-4" />
                ) : (
                  <Copy className="mr-1 h-4 w-4" />
                )}
                Copiar email e senha
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Fechar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
              <DialogDescription>
                A conta será criada com uma senha temporária. Você recebe a
                senha para entregar ao usuário.
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

              <div className="space-y-1">
                <Label htmlFor="invite-password">Senha (opcional)</Label>
                <Input
                  id="invite-password"
                  type="text"
                  placeholder="Deixe vazio para gerar"
                  autoComplete="new-password"
                  {...form.register("password")}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres. Se vazio, geramos uma senha forte.
                </p>
                {form.formState.errors.password ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleClose(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar usuário"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
