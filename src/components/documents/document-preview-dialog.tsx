"use client";

import { useRef, type ReactNode } from "react";
import { FileTextIcon, Maximize2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DocumentScaledPreviewFrame,
  useDocumentPreviewScale,
} from "@/components/documents/document-scaled-preview";

type DocumentPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  pageLabel?: string;
  children: ReactNode;
};

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  pageLabel = "A4",
  children,
}: DocumentPreviewDialogProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scale = useDocumentPreviewScale(viewportRef, 0.92, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[920px] gap-0 overflow-hidden p-0 sm:max-w-[920px]">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-1">{description}</DialogDescription>
              ) : null}
            </div>
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {pageLabel}
            </Badge>
          </div>
        </DialogHeader>
        <div ref={viewportRef} className="branding-preview-dialog-body">
          <DocumentScaledPreviewFrame scale={scale}>{children}</DocumentScaledPreviewFrame>
        </div>
        <div className="flex items-center gap-2 border-t bg-muted/20 px-5 py-2.5 text-[11px] text-muted-foreground">
          <FileTextIcon className="size-3.5 shrink-0 opacity-70" />
          <span className="min-w-0 flex-1 truncate">Демо-данные · реальный PDF использует брендинг компании</span>
          <Maximize2Icon className="size-3.5 shrink-0 opacity-70" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
