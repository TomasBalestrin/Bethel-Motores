import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMentoriaById } from "@/services/mentorias.service";
import { MentoriaHeader } from "@/components/mentorias/MentoriaHeader";
import { MentoriaTabs } from "@/components/mentorias/MentoriaTabs";
import { BreadcrumbLabel } from "@/components/layout/BreadcrumbLabel";

interface LayoutProps {
  children: React.ReactNode;
  params: { mentoriaId: string };
}

export default async function MentoriaDetailLayout({
  children,
  params,
}: LayoutProps) {
  const supabase = await createClient();
  const mentoria = await getMentoriaById(supabase, params.mentoriaId);

  if (!mentoria) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <BreadcrumbLabel
        path={`/motors/mentorias/${mentoria.id}`}
        label={mentoria.name}
      />
      <MentoriaHeader mentoria={mentoria} />
      <MentoriaTabs mentoriaId={mentoria.id} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
