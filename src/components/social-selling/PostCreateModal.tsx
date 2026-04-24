"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
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
  postCreateSchema,
  type PostCreateInput,
} from "@/lib/validators/post";
import type { PostType } from "@/types/post";

interface PostCreateModalProps {
  profileId: string;
  postType: PostType;
}

export function PostCreateModal({ profileId, postType }: PostCreateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<PostCreateInput>({
    resolver: zodResolver(postCreateSchema) as Resolver<PostCreateInput>,
    defaultValues: {
      code: "",
      link: "",
      post_type: postType,
      headline: "",
      posted_at: null,
    },
  });

  async function onSubmit(input: PostCreateInput) {
    try {
      const body = {
        ...input,
        post_type: postType,
        social_profile_id: profileId,
        headline: input.headline || null,
        posted_at: input.posted_at || null,
      };
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao criar post"
        );
      }
      toast.success("Post cadastrado");
      form.reset({
        code: "",
        link: "",
        post_type: postType,
        headline: "",
        posted_at: null,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível criar o post", { description: message });
    }
  }

  const isSubmitting = form.formState.isSubmitting;
  const typeLabel = postType === "impulsionar" ? "Impulsionar" : "Orgânico";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Novo post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo post · {typeLabel}</DialogTitle>
          <DialogDescription>
            Informe o código, link e opcionalmente a headline e data de postagem.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="post-code">Código</Label>
            <Input
              id="post-code"
              placeholder="CAMP-01"
              {...form.register("code")}
            />
            {form.formState.errors.code ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.code.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="post-link">Link do post</Label>
            <Input
              id="post-link"
              type="url"
              placeholder="https://instagram.com/p/..."
              {...form.register("link")}
            />
            {form.formState.errors.link ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.link.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="post-headline">Headline (opcional)</Label>
            <Input
              id="post-headline"
              placeholder="Título/gancho principal do post"
              {...form.register("headline")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="post-posted-at">Data de postagem (opcional)</Label>
            <Input
              id="post-posted-at"
              type="date"
              {...form.register("posted_at")}
            />
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
                  Salvando...
                </>
              ) : (
                "Criar post"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
