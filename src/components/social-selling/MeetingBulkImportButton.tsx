"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MeetingBulkImportModal } from "./MeetingBulkImportModal";

interface MeetingBulkImportButtonProps {
  profileId: string;
}

export function MeetingBulkImportButton({
  profileId,
}: MeetingBulkImportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-1 h-4 w-4" />
        Importar reuniões
      </Button>
      <MeetingBulkImportModal
        profileId={profileId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
