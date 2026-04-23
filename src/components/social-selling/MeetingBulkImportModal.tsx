"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Link2, Loader2, StickyNote, Upload } from "lucide-react";
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
import { readFileText, buildSheetsCsvUrl } from "@/lib/utils/leads-parse";
import {
  parseMeetingImportCsv,
  type MeetingImportRow,
} from "@/lib/utils/post-meetings-parse";

interface MeetingBulkImportModalProps {
  profileId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "csv" | "paste" | "sheets";

const TABS: { value: Tab; label: string; icon: typeof FileUp }[] = [
  { value: "csv", label: "Upload CSV", icon: FileUp },
  { value: "paste", label: "Colar dados", icon: StickyNote },
  { value: "sheets", label: "Google Sheets", icon: Link2 },
];

interface ApiResult {
  posts_created: number;
  posts_updated: number;
  meetings_created: number;
  metrics_snapshots_created: number;
  errors: string[];
}

export function MeetingBulkImportModal({
  profileId,
  open,
  onOpenChange,
}: MeetingBulkImportModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<Tab>("csv");
  const [pastedText, setPastedText] = useState("");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [rows, setRows] = useState<MeetingImportRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  function reset() {
    setPastedText("");
    setSheetsUrl("");
    setRows(null);
    setParseErrors([]);
    setUnmapped([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyParsed(text: string) {
    const parsed = parseMeetingImportCsv(text);
    if (parsed.rows.length === 0) {
      toast.error("Nenhuma linha válida", {
        description:
          parsed.errors[0] ??
          "Confirme cabeçalhos: Data da Análise, Link do post, Investido, Cortar?",
      });
      return;
    }
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
    setUnmapped(parsed.unmappedHeaders);
    setResult(null);
  }

  async function handleFile(file: File) {
    try {
      const text = await readFileText(file);
      applyParsed(text);
    } catch (error) {
      toast.error("Erro ao ler arquivo", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function handlePaste() {
    applyParsed(pastedText);
  }

  async function handleSheets() {
    const built = buildSheetsCsvUrl(sheetsUrl.trim());
    if (!built) {
      toast.error("URL inválida");
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
      applyParsed(text);
    } catch (error) {
      toast.error("Erro ao importar planilha", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function confirmImport() {
    if (!rows || rows.length === 0) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/profiles/${profileId}/meetings-bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao importar"
        );
      }
      const json = await response.json();
      const data = json.data as ApiResult;
      setResult(data);
      toast.success(
        `${data.meetings_created} reuniõ${data.meetings_created === 1 ? "ão" : "ões"} importada${data.meetings_created === 1 ? "" : "s"}`,
        {
          description:
            data.posts_created > 0
              ? `${data.posts_created} post${data.posts_created === 1 ? "" : "s"} novo${data.posts_created === 1 ? "" : "s"} criado${data.posts_created === 1 ? "" : "s"}`
              : undefined,
        }
      );
      router.refresh();
    } catch (error) {
      toast.error("Falha na importação", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const placeholders = rows?.filter((r) => r.is_placeholder).length ?? 0;
  const filled = rows ? rows.length - placeholders : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar reuniões
          </DialogTitle>
          <DialogDescription>
            Cada linha vira uma reunião (terça ou sexta, detectada pelo dia da
            semana). Posts novos são criados automaticamente; posts existentes
            ganham a reunião nova. Linhas sem métricas viram placeholders.
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
                  setRows(null);
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
              <Label htmlFor="mt-csv">Arquivo CSV</Label>
              <input
                ref={fileInputRef}
                id="mt-csv"
                type="file"
                accept=".csv,text/csv,.tsv,text/tab-separated-values"
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
              <Label htmlFor="mt-paste">Cole com cabeçalhos na 1ª linha</Label>
              <textarea
                id="mt-paste"
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Data da Análise,Data de postagem,Link do post,Investido,Seguidores,..."
              />
              <Button type="button" size="sm" onClick={handlePaste}>
                Ler dados colados
              </Button>
            </div>
          ) : null}

          {tab === "sheets" ? (
            <div className="space-y-2">
              <Label htmlFor="mt-sheets">URL da planilha</Label>
              <Input
                id="mt-sheets"
                type="url"
                value={sheetsUrl}
                onChange={(event) => setSheetsUrl(event.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="text-xs text-muted-foreground">
                Compartilhe como &quot;qualquer um com o link pode
                visualizar&quot;.
              </p>
              <Button type="button" size="sm" onClick={handleSheets}>
                Buscar planilha
              </Button>
            </div>
          ) : null}

          {rows && !result ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {rows.length} linhas prontas
                  {filled > 0 ? ` · ${filled} com métricas` : ""}
                  {placeholders > 0
                    ? ` · ${placeholders} placeholder${placeholders === 1 ? "" : "s"}`
                    : ""}
                </span>
                {unmapped.length > 0 ? (
                  <span className="text-muted-foreground">
                    Colunas ignoradas: {unmapped.join(", ")}
                  </span>
                ) : null}
              </div>
              {parseErrors.length > 0 ? (
                <div className="max-h-24 overflow-auto rounded bg-destructive/10 p-2 text-[11px] text-destructive">
                  {parseErrors.slice(0, 10).map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              ) : null}
              <div className="max-h-48 space-y-1 overflow-auto">
                {rows.slice(0, 30).map((row, index) => (
                  <div
                    key={`${row.link}-${row.meeting_date}-${index}`}
                    className="flex gap-2 border-b border-border/50 py-1 text-[11px]"
                  >
                    <span className="w-16 text-muted-foreground">
                      {row.meeting_date}
                    </span>
                    <span className="w-12 text-primary">
                      {row.meeting_type === "terca" ? "Terça" : "Sexta"}
                    </span>
                    <span className="flex-1 truncate font-mono">
                      {row.shortcode ?? row.link}
                    </span>
                    {row.is_placeholder ? (
                      <span className="text-muted-foreground">placeholder</span>
                    ) : (
                      <span className="text-foreground">
                        R$ {(row.investment ?? 0).toFixed(2)}
                      </span>
                    )}
                    {row.pause_post ? (
                      <span className="text-destructive">pausar</span>
                    ) : null}
                  </div>
                ))}
                {rows.length > 30 ? (
                  <p className="pt-1 text-center text-muted-foreground">
                    +{rows.length - 30} linhas não exibidas no preview
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <span>
                  Posts criados: <strong>{result.posts_created}</strong>
                </span>
                <span>
                  Posts atualizados: <strong>{result.posts_updated}</strong>
                </span>
                <span>
                  Reuniões: <strong>{result.meetings_created}</strong>
                </span>
                <span>
                  Snapshots de métricas:{" "}
                  <strong>{result.metrics_snapshots_created}</strong>
                </span>
              </div>
              {result.errors.length > 0 ? (
                <div className="max-h-32 overflow-auto rounded bg-destructive/10 p-2 text-[11px] text-destructive">
                  <p className="font-semibold">Erros:</p>
                  {result.errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
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
              disabled={!rows || rows.length === 0 || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${rows?.length ?? 0} reuniões`
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
