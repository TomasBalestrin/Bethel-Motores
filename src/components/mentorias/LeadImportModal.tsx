"use client";

import { useRef, useState } from "react";
import { FileUp, Link2, Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildSheetsCsvUrl,
  parseLeadsFromCsv,
  readFileText,
} from "@/lib/utils/leads-parse";
import type { LeadCreateInput } from "@/lib/validators/lead";

interface LeadImportModalProps {
  funnelId: string;
  funnelName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Tab = "csv" | "paste" | "sheets";

const TABS: { value: Tab; label: string; icon: typeof FileUp }[] = [
  { value: "csv", label: "Upload CSV", icon: FileUp },
  { value: "paste", label: "Colar dados", icon: StickyNote },
  { value: "sheets", label: "Google Sheets", icon: Link2 },
];

interface BulkResult {
  inserted: number;
  updated: number;
}

async function submitBulk(
  funnelId: string,
  leads: LeadCreateInput[]
): Promise<BulkResult> {
  const response = await fetch(`/api/funnels/${funnelId}/leads/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leads }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data?.error === "string" ? data.error : "Erro ao importar"
    );
  }
  const data = await response.json();
  return {
    inserted: Number(data?.data?.inserted ?? 0),
    updated: Number(data?.data?.updated ?? 0),
  };
}

export function LeadImportModal({
  funnelId,
  funnelName,
  open,
  onOpenChange,
  onSuccess,
}: LeadImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<Tab>("csv");
  const [pastedText, setPastedText] = useState("");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [preview, setPreview] = useState<LeadCreateInput[] | null>(null);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setPastedText("");
    setSheetsUrl("");
    setPreview(null);
    setUnmapped([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    try {
      const text = await readFileText(file);
      const result = parseLeadsFromCsv(text);
      if (result.leads.length === 0) {
        toast.error("Nenhum lead detectado no arquivo", {
          description:
            "Verifique se há uma coluna de Nome e se o CSV tem cabeçalhos.",
        });
        return;
      }
      setPreview(result.leads);
      setUnmapped(result.unmappedHeaders);
    } catch (error) {
      toast.error("Erro ao ler arquivo", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function handlePaste() {
    const result = parseLeadsFromCsv(pastedText);
    if (result.leads.length === 0) {
      toast.error("Nenhum lead detectado", {
        description: "Cole o conteúdo com cabeçalhos na primeira linha.",
      });
      return;
    }
    setPreview(result.leads);
    setUnmapped(result.unmappedHeaders);
  }

  async function handleSheets() {
    const built = buildSheetsCsvUrl(sheetsUrl.trim());
    if (!built) {
      toast.error("URL inválida", {
        description: "Cole o link da planilha do Google Sheets.",
      });
      return;
    }
    try {
      const response = await fetch(built);
      if (!response.ok) {
        throw new Error(
          "Não foi possível ler a planilha — habilite 'qualquer um com o link pode visualizar'."
        );
      }
      const text = await response.text();
      const result = parseLeadsFromCsv(text);
      if (result.leads.length === 0) {
        toast.error("Nenhum lead detectado", {
          description: "Confirme que a primeira linha tem cabeçalhos.",
        });
        return;
      }
      setPreview(result.leads);
      setUnmapped(result.unmappedHeaders);
    } catch (error) {
      toast.error("Erro ao importar da planilha", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function confirmImport() {
    if (!preview || preview.length === 0) return;
    setSubmitting(true);
    try {
      const result = await submitBulk(funnelId, preview);
      const parts: string[] = [];
      if (result.inserted > 0)
        parts.push(
          result.inserted === 1
            ? "1 lead novo"
            : `${result.inserted} leads novos`
        );
      if (result.updated > 0)
        parts.push(
          result.updated === 1
            ? "1 atualizado"
            : `${result.updated} atualizados`
        );
      if (parts.length === 0)
        parts.push("Nada novo pra salvar — tudo já estava preenchido");
      toast.success(parts.join(" · "));
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Falha na importação", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar leads — {funnelName}</DialogTitle>
          <DialogDescription>
            Cabeçalhos reconhecidos: Nome, Telefone, Instagram, Faturamento,
            Nicho. Outros cabeçalhos são ignorados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b border-border">
          {TABS.map((entry) => {
            const Icon = entry.icon;
            const active = tab === entry.value;
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => {
                  setTab(entry.value);
                  setPreview(null);
                }}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" /> {entry.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 pt-3">
          {tab === "csv" ? (
            <div className="space-y-2">
              <Label htmlFor="lead-csv">Arquivo CSV</Label>
              <input
                ref={fileInputRef}
                id="lead-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
          ) : null}

          {tab === "paste" ? (
            <div className="space-y-2">
              <Label htmlFor="lead-paste">Cole com cabeçalhos na 1ª linha</Label>
              <textarea
                id="lead-paste"
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Nome,Telefone,Instagram,Faturamento,Nicho&#10;Ana,(11) 99999-9999,@ana,15000,E-commerce"
              />
              <Button type="button" size="sm" onClick={handlePaste}>
                Ler dados colados
              </Button>
            </div>
          ) : null}

          {tab === "sheets" ? (
            <div className="space-y-2">
              <Label htmlFor="lead-sheets">URL da planilha</Label>
              <Input
                id="lead-sheets"
                type="url"
                value={sheetsUrl}
                onChange={(event) => setSheetsUrl(event.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=0"
              />
              <p className="text-xs text-muted-foreground">
                Compartilhe a planilha como &quot;qualquer um com o link pode
                visualizar&quot; antes de importar.
              </p>
              <Button type="button" size="sm" onClick={handleSheets}>
                Buscar planilha
              </Button>
            </div>
          ) : null}

          {preview ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {preview.length === 1
                    ? "1 lead pronto para importar"
                    : `${preview.length} leads prontos para importar`}
                </span>
                {unmapped.length > 0 ? (
                  <span className="text-muted-foreground">
                    Colunas ignoradas: {unmapped.join(", ")}
                  </span>
                ) : null}
              </div>
              <div className="max-h-40 space-y-1 overflow-auto">
                {preview.slice(0, 20).map((lead, index) => (
                  <div
                    key={`${lead.name}-${index}`}
                    className="flex gap-2 border-b border-border/50 py-1 text-[11px]"
                  >
                    <span className="flex-1 truncate font-medium">
                      {lead.name}
                    </span>
                    <span className="text-muted-foreground">
                      {lead.phone ?? "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {lead.instagram_handle ?? "—"}
                    </span>
                  </div>
                ))}
                {preview.length > 20 ? (
                  <p className="pt-1 text-center text-[11px] text-muted-foreground">
                    +{preview.length - 20} leads não exibidos no preview
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={confirmImport}
            disabled={!preview || preview.length === 0 || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${preview?.length ?? 0} leads`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
