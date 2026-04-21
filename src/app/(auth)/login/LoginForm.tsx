"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "idle" | "loading" | "success" | "error";

export function LoginForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: LoginInput) {
    setStatus("loading");
    const supabase = createClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      toast.error("Não foi possível enviar o link", {
        description: error.message,
      });
      return;
    }

    setSentTo(email);
    setStatus("success");
    toast.success("Link enviado", {
      description: "Confira seu email para continuar",
      duration: 5000,
    });
  }

  if (status === "success" && sentTo) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <h2 className="font-heading text-lg font-semibold">Verifique seu email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviamos um link para <span className="font-medium">{sentTo}</span>.
          O link expira em 10 minutos.
        </p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => {
            setStatus("idle");
            setSentTo(null);
          }}
        >
          Usar outro email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@bethel.com.br"
          aria-invalid={Boolean(errors.email)}
          disabled={status === "loading"}
          {...register("email")}
        />
        {errors.email ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!isValid || status === "loading"}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar link"
        )}
      </Button>
    </form>
  );
}
