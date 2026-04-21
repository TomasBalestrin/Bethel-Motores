import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  createTemplate,
  getTemplateById,
} from "@/services/funnels.service";
import { Button } from "@/components/ui/button";
import { FunnelTemplateEditor } from "@/components/mentorias/FunnelTemplateEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { templateId: string };
}

export default async function FunnelTemplateEditorPage({ params }: PageProps) {
  const supabase = await createClient();

  if (params.templateId === "new") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const created = await createTemplate(
      supabase,
      { name: "Novo template", description: null, is_default: false },
      { actorId: user.id }
    );
    redirect(`/settings/funnel-templates/${created.id}`);
  }

  const template = await getTemplateById(supabase, params.templateId);
  if (!template) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/settings/funnel-templates">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para templates
        </Link>
      </Button>

      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {template.name}
        </h1>
        {template.description ? (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        ) : null}
      </header>

      <FunnelTemplateEditor template={template} />
    </div>
  );
}
