"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  passwordChangeSchema,
  type PasswordChangeInput,
} from "@/lib/validators/auth";

export function PasswordChangeForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { current_password: "", new_password: "" },
  });

  async function onSubmit(input: PasswordChangeInput) {
    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao alterar senha"
        );
      }
      toast.success("Senha alterada");
      reset({ current_password: "", new_password: "" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível alterar", { description: message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="current-password">Senha atual</Label>
        <div className="relative">
          <Input
            id="current-password"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            {...register("current_password")}
          />
          <button
            type="button"
            aria-label={showCurrent ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCurrent((prev) => !prev)}
          >
            {showCurrent ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.current_password ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.current_password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="new-password">Nova senha</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            {...register("new_password")}
          />
          <button
            type="button"
            aria-label={showNew ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNew((prev) => !prev)}
          >
            {showNew ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        {errors.new_password ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.new_password.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Alterar senha"
          )}
        </Button>
      </div>
    </form>
  );
}
