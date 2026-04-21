"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

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

interface SecretDisplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string | null;
  secret: string | null;
}

export function SecretDisplayModal({
  open,
  onOpenChange,
  slug,
  secret,
}: SecretDisplayModalProps) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Secret copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-warning" />
            Guarde este secret
          </DialogTitle>
          <DialogDescription>
            Esta é a única vez que o secret será exibido. Guarde em local
            seguro — após fechar, será impossível recuperá-lo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Slug</p>
            <p className="font-mono text-sm">{slug ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Secret</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={secret ?? ""}
                className="font-mono text-xs"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" size="sm" onClick={copySecret}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Envie no header <code>x-webhook-secret</code> em chamadas POST
            para <code>/api/webhooks/{slug ?? "{slug}"}</code>.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
