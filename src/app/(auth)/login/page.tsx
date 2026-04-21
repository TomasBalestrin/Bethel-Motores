import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar — Bethel Motores",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Entrar no Bethel Motores
        </h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um link mágico para seu email
        </p>
      </header>

      <LoginForm />

      <p className="text-center text-xs text-muted-foreground">
        Ao entrar você concorda com os termos de uso interno Bethel
      </p>
    </div>
  );
}
