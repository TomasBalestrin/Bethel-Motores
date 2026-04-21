import { Suspense } from "react";
import { Layers } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listActiveMotors } from "@/services/motors.service";
import { MotorCard } from "@/components/motors/MotorCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";

export const dynamic = "force-dynamic";

export default function MotorsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Motores
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecione o motor para continuar
        </p>
      </header>

      <Suspense fallback={<LoadingState count={3} />}>
        <MotorsGrid />
      </Suspense>
    </div>
  );
}

async function MotorsGrid() {
  const supabase = await createClient();
  const motors = await listActiveMotors(supabase);

  if (motors.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Nenhum motor disponível"
        description="Contate um admin para ativar um motor."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {motors.map((motor) => (
        <MotorCard key={motor.id} motor={motor} />
      ))}
    </div>
  );
}
