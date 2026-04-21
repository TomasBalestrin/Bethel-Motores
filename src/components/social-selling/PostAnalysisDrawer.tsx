"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { ProfilePost } from "@/services/social-profiles.service";

type Tab = "file" | "link" | "text";

interface PostAnalysisDrawerProps {
  post: ProfilePost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function PostAnalysisDrawer({
  post,
  open,
  onOpenChange,
}: PostAnalysisDrawerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("text");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab("text");
    setFile(null);
    setLink("");
    setNote("");
    setText("");
  }, [open]);

  async function uploadFile(currentPost: ProfilePost, source: File) {
    if (!source.type.startsWith("text/")) {
      throw new Error("Apenas arquivos de texto (.txt) são aceitos");
    }
    if (source.size > MAX_FILE_BYTES) {
      throw new Error("Arquivo maior que 5MB");
    }
    const supabase = createClient();
    const safeName = source.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .slice(0, 80);
    const path = `${currentPost.id}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from("post-analyses")
      .upload(path, source, {
        contentType: source.type,
        upsert: false,
      });
    if (error) throw error;
    return { file_url: path, file_name: source.name };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) return;

    setSubmitting(true);
    try {
      let body: Record<string, unknown>;
      if (tab === "file") {
        if (!file) throw new Error("Selecione um arquivo .txt");
        const uploaded = await uploadFile(post, file);
        body = { source: "file", ...uploaded };
      } else if (tab === "link") {
        if (!link.trim()) throw new Error("Informe um link válido");
        body = {
          source: "link",
          link: link.trim(),
          note: note.trim() || undefined,
        };
      } else {
        if (!text.trim()) throw new Error("Escreva ao menos uma linha");
        body = { source: "text", content_text: text };
      }

      const response = await fetch(`/api/posts/${post.id}/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao salvar análise"
        );
      }
      toast.success("Análise adicionada");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  if (!post) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Adicionar análise · {post.code}</DrawerTitle>
          <DrawerDescription>
            Escolha uma das três formas de registrar a análise.
          </DrawerDescription>
        </DrawerHeader>

        <form
          id="post-analysis-form"
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2"
        >
          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file">Upload TXT</TabsTrigger>
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="text">Texto</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-2 pt-3">
              <Label htmlFor="analysis-file">Arquivo (.txt, até 5MB)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="analysis-file"
                  type="file"
                  accept="text/plain,.txt"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] ?? null)
                  }
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {file ? (
                <p className="text-xs text-muted-foreground">
                  {file.name} · {(file.size / 1024).toFixed(1)} kB
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="link" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label htmlFor="analysis-link">URL</Label>
                <Input
                  id="analysis-link"
                  type="url"
                  placeholder="https://..."
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="analysis-note">Observação (opcional)</Label>
                <Input
                  id="analysis-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Resumo curto"
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-2 pt-3">
              <Label htmlFor="analysis-text">Texto (markdown)</Label>
              <textarea
                id="analysis-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="## Resumo\n..."
                className="h-40 w-full rounded-md border border-border bg-background p-2 text-sm font-mono"
              />
            </TabsContent>
          </Tabs>
        </form>

        <DrawerFooter className="flex-row justify-end gap-2">
          <DrawerClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancelar
            </Button>
          </DrawerClose>
          <Button
            type="submit"
            form="post-analysis-form"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Adicionar"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
