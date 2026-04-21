import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold">
          Página não encontrada
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          A rota que você tentou acessar não existe ou foi movida.
        </p>
      </div>
      <Button asChild>
        <Link href="/motors">Voltar para Motores</Link>
      </Button>
    </div>
  );
}
