"use client";

import { useRef, useState } from "react";
import { FileUp, Link2, Loader2, StickyNote, Users } from "lucide-react";
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
  parseAttendanceFromCsv,
  readFileText,
} from "@/lib/utils/leads-parse";
import type { AttendanceEntry, AttendanceResult } from "@/services/leads.service";

interface GroupImportModalProps {
  mentoriaId: string;
  mentoriaName: string;
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

async function submitGroup(
  mentoriaId: string,
  entries: AttendanceEntry[]
): Promise<AttendanceResult> {
  const response = await fetch(
    `/api/mentorias/${mentoriaId}/leads/group`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Erro ao marcar participação no grupo"
    );
  }
  const data = await response.json();
  return data.data as AttendanceResult;
}

export function GroupImportModal({
  mentoriaId,
  mentoriaName,
  open,
  onOpenChange,
  onSuccess,
}: GroupImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<Tab>("csv");
  const [pastedText, setPastedText] = useState("");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [preview, setPreview] = useState<AttendanceEntry[] | null>(null);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);

  function reset() {
    setPastedText("");
    setSheetsUrl("");
    setPreview(null);
    setUnmapped([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    try {
      const text = await readFileText(file);
      const parsed = parseAttendanceFromCsv(text);
      if (parsed.entries.length === 0) {
        toast.error("Nenhuma linha detectada", {
          description:
            "Verifique se tem coluna de Nome, Telefone ou Instagram com cabeçalho.",
        });
        return;
      }
      setPreview(parsed.entries);
      setUnmapped(parsed.unmappedHeaders);
      setResult(null);
    } catch (error) {
      toast.error("Erro ao ler arquivo", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function handlePaste() {
    const parsed = parseAttendanceFromCsv(pastedText);
    if (parsed.entries.length === 0) {
      toast.error("Nenhuma linha detectada", {
        description: "Cole com cabeçalhos na primeira linha.",
      });
      return;
    }
    setPreview(parsed.entries);
    setUnmapped(parsed.unmappedHeaders);
    setResult(null);
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
      const parsed = parseAttendanceFromCsv(text);
      if (parsed.entries.length === 0) {
        toast.error("Nenhuma linha detectada", {
          description: "Confirme que a primeira linha tem cabeçalhos.",
        });
        return;
      }
      setPreview(parsed.entries);
      setUnmapped(parsed.unmappedHeaders);
      setResult(null);
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
      const response = await submitGroup(mentoriaId, preview);
      setResult(response);
      if (response.matched > 0) {
        toast.success(
          response.matched === 1
            ? "1 lead marcado como no grupo"
            : `${response.matched} leads marcados como no grupo`,
          {
            description:
              response.notMatched.length > 0
                ? `${response.notMatched.length} linha${
                    response.notMatched.length === 1 ? "" : "s"
                  } sem correspondência`
                : undefined,
          }
        );
      } else {
        toast.warning("Nenhum lead bateu com a lista", {
          description:
            "Verifique se as colunas (telefone/@/nome) estão no formato correto.",
        });
      }
      onSuccess?.();
    } catch (error) {
      toast.error("Falha ao marcar participação no grupo", {
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
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Importar lista de grupos — {mentoriaName}
          </DialogTitle>
          <DialogDescription>
            Cada linha será comparada com os leads de{" "}
            <strong>todos os funis</strong> desta mentoria. Basta{" "}
            <strong>telefone ou nome</strong> bater para marcar o lead.
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
                  setResult(null);
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
              <Label htmlFor="grp-csv">Arquivo CSV</Label>
              <input
                ref={fileInputRef}
                id="grp-csv"
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
              <Label htmlFor="grp-paste">
                Cole com cabeçalhos na 1ª linha
              </Label>
              <textarea
                id="grp-paste"
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Nome,Telefone,Instagram&#10;Ana,(11) 99999-9999,@ana"
              />
              <Button type="button" size="sm" onClick={handlePaste}>
                Ler dados colados
              </Button>
            </div>
          ) : null}

          {tab === "sheets" ? (
            <div className="space-y-2">
              <Label htmlFor="grp-sheets">URL da planilha</Label>
              <Input
                id="grp-sheets"
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

          {preview && !result ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {preview.length === 1
                    ? "1 linha pronta para marcar"
                    : `${preview.length} linhas prontas para marcar`}
                </span>
                {unmapped.length > 0 ? (
                  <span className="text-muted-foreground">
                    Colunas ignoradas: {unmapped.join(", ")}
                  </span>
                ) : null}
              </div>
              <div className="max-h-40 space-y-1 overflow-auto">
                {preview.slice(0, 20).map((entry, index) => (
                  <div
                    key={`${entry.name ?? ""}-${entry.phone ?? ""}-${index}`}
                    className="flex gap-2 border-b border-border/50 py-1 text-[11px]"
                  >
                    <span className="flex-1 truncate font-medium">
                      {entry.name ?? "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {entry.phone ?? "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {entry.instagram_handle ?? "—"}
                    </span>
                  </div>
                ))}
                {preview.length > 20 ? (
                  <p className="pt-1 text-center text-[11px] text-muted-foreground">
                    +{preview.length - 20} linhas não exibidas no preview
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-success">
                  {result.matched}{" "}
                  {result.matched === 1
                    ? "marcado como no grupo"
                    : "marcados como no grupo"}
                </span>
                {result.notMatched.length > 0 ? (
                  <span className="font-semibold text-warning">
                    {result.notMatched.length} não encontrado
                    {result.notMatched.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              {result.notMatched.length > 0 ? (
                <div className="max-h-40 space-y-1 overflow-auto">
                  <p className="font-semibold text-muted-foreground">
                    Linhas sem correspondência (cadastre manualmente depois se
                    necessário):
                  </p>
                  {result.notMatched.slice(0, 50).map((entry, index) => (
                    <div
                      key={`nm-${index}`}
                      className="flex gap-2 border-b border-border/50 py-1 text-[11px]"
                    >
                      <span className="flex-1 truncate font-medium">
                        {entry.name ?? "—"}
                      </span>
                      <span className="text-muted-foreground">
                        {entry.phone ?? "—"}
                      </span>
                      <span className="text-muted-foreground">
                        {entry.instagram_handle ?? "—"}
                      </span>
                    </div>
                  ))}
                  {result.notMatched.length > 50 ? (
                    <p className="pt-1 text-center text-[11px] text-muted-foreground">
                      +{result.notMatched.length - 50} não exibidos
                    </p>
                  ) : null}
                </div>
              ) : null}
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
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result ? (
            <Button
              type="button"
              onClick={confirmImport}
              disabled={!preview || preview.length === 0 || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Marcando...
                </>
              ) : (
                `Marcar no grupo (${preview?.length ?? 0})`
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
