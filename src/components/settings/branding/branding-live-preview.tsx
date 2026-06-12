"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Eye, FileText, Maximize2, Palette } from "lucide-react";

import { WorkOrderDocument } from "@/components/documents/work-order/work-order-document";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentTheme } from "@/domain/company-branding";
import { WarrantyTemplateId } from "@/domain/document-config";
import {
  DEFAULT_DOCUMENT_HEADER_VISIBILITY,
  DocumentHeaderVisibility,
} from "@/domain/document-header-config";
import { DocumentWatermarkConfig } from "@/domain/document-watermark-config";
import { buildBrandingPreviewContext } from "@/lib/documents/build-branding-preview-context";
import { DOCUMENT_THEME_LABELS_RU } from "@/lib/documents/themes/tokens";
import { cn } from "@/lib/utils";

export type BrandingLivePreviewInput = {
  companyName: string;
  shortName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  headerLogoMaxHeightMm?: number;
  documentWatermark?: DocumentWatermarkConfig;
  documentTheme?: DocumentTheme;
  visibility?: Partial<DocumentHeaderVisibility>;
  showServiceLogbook?: boolean;
  warrantyTemplateId?: WarrantyTemplateId;
  warrantyLabel?: string;
  warrantyText?: string;
};

type BrandingLivePreviewProps = {
  input: BrandingLivePreviewInput;
  compact?: boolean;
};

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

function usePreviewScale(
  viewportRef: React.RefObject<HTMLElement | null>,
  maxScale = 0.72,
  active = true,
) {
  const [scale, setScale] = useState(0.48);

  useEffect(() => {
    if (!active) return;

    let observer: ResizeObserver | null = null;
    let frame = 0;

    const update = () => {
      const node = viewportRef.current;
      if (!node) return;
      const available = Math.max(240, node.clientWidth - 8);
      const next = Math.min(maxScale, Math.max(0.34, available / PAGE_WIDTH_PX));
      setScale(next);
    };

    const attach = () => {
      const node = viewportRef.current;
      if (!node) {
        frame = window.requestAnimationFrame(attach);
        return;
      }
      update();
      observer = new ResizeObserver(update);
      observer.observe(node);
    };

    attach();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [viewportRef, maxScale, active]);

  return scale;
}

function ScaledPreviewFrame({
  scale,
  children,
}: {
  scale: number;
  children: ReactNode;
}) {
  return (
    <div
      className="branding-preview-scale-outer"
      style={{ height: Math.round(PAGE_HEIGHT_PX * scale) }}
    >
      <div
        className="branding-preview-scale-inner"
        style={{
          width: PAGE_WIDTH_PX,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function BrandingLivePreview({ input, compact = false }: BrandingLivePreviewProps) {
  const theme = input.documentTheme ?? "modern";
  const [dialogOpen, setDialogOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dialogViewportRef = useRef<HTMLDivElement>(null);
  const inlineScale = usePreviewScale(viewportRef, 0.58);
  const dialogScale = usePreviewScale(dialogViewportRef, 0.95, dialogOpen);

  const previewContext = useMemo(() => buildBrandingPreviewContext(input), [input]);

  const palette = [
    { label: "Бренд", color: input.primaryColor ?? "#111827" },
    { label: "Шапка", color: input.headerBackgroundColor ?? "#ffffff" },
    { label: "Текст", color: input.headerTextColor ?? "#111827" },
    { label: "Акцент", color: input.secondaryColor ?? "#4f46e5" },
  ];

  const previewPage = <WorkOrderDocument context={previewContext} />;

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-card shadow-sm",
          compact && "rounded-xl",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Eye className="size-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Живое превью PDF</p>
              <p className="text-[11px] text-muted-foreground">Нажмите на страницу для увеличения</p>
            </div>
          </div>
          <span className="rounded-full border bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {DOCUMENT_THEME_LABELS_RU[theme]}
          </span>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {palette.map((swatch) => (
              <div
                key={swatch.label}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-2 py-1 text-[10px] font-medium"
              >
                <span
                  className="size-3 rounded-full border border-foreground/10"
                  style={{ background: swatch.color }}
                />
                {swatch.label}
              </div>
            ))}
          </div>

          <motion.div layout className="overflow-hidden rounded-xl border shadow-inner">
            <div className="flex items-center justify-between gap-2 border-b bg-background/70 px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">Заказ-наряд · пример</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Maximize2 className="size-3" />
                A4
              </span>
            </div>

            <div ref={viewportRef} className="branding-preview-viewport">
              <button
                type="button"
                className="branding-preview-trigger"
                onClick={() => setDialogOpen(true)}
                aria-label="Открыть превью PDF в полном размере"
              >
                <motion.div
                  key={`${theme}-${input.logoUrl}-${input.documentWatermark?.type}-${input.documentWatermark?.opacity}-${input.documentWatermark?.scale}-${input.documentWatermark?.rotation}-${input.documentWatermark?.position}-${input.documentWatermark?.blend}-${input.warrantyTemplateId}-${input.warrantyLabel}-${input.showServiceLogbook}`}
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <ScaledPreviewFrame scale={inlineScale}>{previewPage}</ScaledPreviewFrame>
                </motion.div>
                <p className="branding-preview-hint">Нажмите, чтобы открыть превью</p>
              </button>
            </div>
          </motion.div>

          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <Palette className="mt-0.5 size-3.5 shrink-0" />
            Изменения логотипа, водяного знака, цветов, темы и элементов шапки сразу отражаются здесь и в реальных PDF после сохранения.
          </p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[920px] gap-0 overflow-hidden p-0 sm:max-w-[920px]">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-base">Превью PDF · {DOCUMENT_THEME_LABELS_RU[theme]}</DialogTitle>
          </DialogHeader>
          <div ref={dialogViewportRef} className="branding-preview-dialog-body">
            <ScaledPreviewFrame scale={dialogScale}>{previewPage}</ScaledPreviewFrame>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
