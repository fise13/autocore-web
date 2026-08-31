"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  DocumentScaledPreviewFrame,
  useDocumentPreviewScale,
} from "@/components/documents/document-scaled-preview";
import { RenderDocument } from "@/components/documents/registry/render-document";
import { useSellMotorDialogLabels } from "@/components/marketing/modals/use-sell-motor-dialog-labels";
import { useLandingDemoSnapshot } from "@/components/marketing/modals/use-landing-demo-snapshot";
import { useMarketingDocumentContext } from "@/components/marketing/modals/use-marketing-document-context";
import { useProductContent } from "@/components/marketing/product/content/use-product-content";
import { SaleMotorsExcel } from "@/components/marketing/experience/surfaces/sale-motors-excel";
import { ScaledDesktopStage } from "@/components/marketing/experience/ui/scaled-desktop-stage";
import { SellMotorDialog, type MotorSellPayload } from "@/components/motors/sell-motor-dialog";
import { Button } from "@/components/ui/button";
import {
  toLandingSaleMotorEntity,
  type LandingSaleMotor,
} from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const CASCADE_STEP_MS = 900;
const CASCADE_TO_PDF_MS = 700;

type Phase = "idle" | "dialog" | "cascade" | "document";

/** Interactive sale walkthrough for the Product page. */
export function ProductSaleDemo() {
  const reduced = useReducedMotion();
  const { sections } = useProductContent();
  const copy = sections.sale;
  const sellLabels = useSellMotorDialogLabels();
  const { landingSaleDocumentContext } = useMarketingDocumentContext();
  const { landingDemoMotorsSale, landingDemoSaleClient } = useLandingDemoSnapshot();
  const [phase, setPhase] = useState<Phase>("idle");
  const [cascadeStep, setCascadeStep] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMotor, setSelectedMotor] = useState<LandingSaleMotor>(landingDemoMotorsSale[0]);
  const confirmedRef = useRef(false);
  const timers = useRef<number[]>([]);
  const pdfViewportRef = useRef<HTMLDivElement>(null);
  const pdfScale = useDocumentPreviewScale(pdfViewportRef, 1, phase === "document", "contain");
  const motorEntity = useMemo(() => toLandingSaleMotorEntity(selectedMotor), [selectedMotor]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    confirmedRef.current = false;
    setDialogOpen(false);
    setCascadeStep(-1);
    setPhase("idle");
  }, [clearTimers]);

  const startCascade = useCallback(() => {
    clearTimers();
    setPhase("cascade");
    setCascadeStep(-1);

    if (reduced) {
      setCascadeStep(copy.cascade.length - 1);
      const toPdf = window.setTimeout(() => setPhase("document"), 320);
      timers.current.push(toPdf);
      return;
    }

    copy.cascade.forEach((_, index) => {
      const id = window.setTimeout(() => setCascadeStep(index), CASCADE_STEP_MS * (index + 1));
      timers.current.push(id);
    });

    const toPdf = window.setTimeout(
      () => setPhase("document"),
      CASCADE_STEP_MS * copy.cascade.length + CASCADE_TO_PDF_MS,
    );
    timers.current.push(toPdf);
  }, [clearTimers, reduced, copy.cascade]);

  const openSell = useCallback((motor: LandingSaleMotor) => {
    confirmedRef.current = false;
    setSelectedMotor(motor);
    setPhase("dialog");
    setDialogOpen(true);
  }, []);

  const onDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && !confirmedRef.current) {
      setPhase((current) => (current === "dialog" ? "idle" : current));
    }
  };

  async function onConfirm(_payload: MotorSellPayload) {
    confirmedRef.current = true;
    startCascade();
  }

  return (
    <div className="product-sale-demo">
      <AnimatePresence mode="wait">
        {phase === "idle" || phase === "dialog" ? (
          <motion.div
            key="grid"
            className="product-sale-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <ScaledDesktopStage>
              <SaleMotorsExcel
                selectedId={selectedMotor.id}
                sellLabel={copy.sellLabel}
                onSelect={setSelectedMotor}
                onSell={openSell}
                compact
              />
            </ScaledDesktopStage>
          </motion.div>
        ) : null}

        {phase === "cascade" ? (
          <motion.div
            key="cascade"
            className="product-sale-panel product-sale-cascade"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <ul className="exp-sale-cascade-list">
              {copy.cascade.map((label, index) => {
                const done = index <= cascadeStep;
                const showArrow = index < copy.cascade.length - 1;
                return (
                  <li key={label} className="exp-sale-cascade-block">
                    <motion.div
                      className={cn("exp-sale-cascade-item", done && "is-done")}
                      initial={false}
                      animate={{ opacity: done ? 1 : 0.32 }}
                      transition={{ duration: 0.28 }}
                    >
                      <span className={cn("exp-sale-cascade-check", done && "is-done")}>
                        {done ? <Check className="size-3.5" strokeWidth={2.5} /> : null}
                      </span>
                      <span>{label}</span>
                    </motion.div>
                    {showArrow ? (
                      <motion.div
                        className="exp-sale-cascade-arrow"
                        aria-hidden
                        initial={false}
                        animate={{ opacity: done ? 0.55 : 0.18 }}
                      >
                        ↓
                      </motion.div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}

        {phase === "document" ? (
          <motion.div
            key="document"
            className="product-sale-panel product-sale-document"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div className="exp-sale-document-toolbar">
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="size-3.5" aria-hidden />
                {copy.replay}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                <X className="size-3.5" aria-hidden />
                {copy.closeDocument}
              </Button>
            </div>
            <div ref={pdfViewportRef} className="exp-sale-document-viewport">
              <DocumentScaledPreviewFrame scale={pdfScale}>
                <div className="exp-sale-document-paper">
                  <RenderDocument slug="engine-warranty" context={landingSaleDocumentContext} />
                </div>
              </DocumentScaledPreviewFrame>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SellMotorDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        motor={motorEntity}
        companyId={null}
        mode="sell"
        labels={sellLabels}
        onConfirm={onConfirm}
        initialValues={{
          amount: selectedMotor.price,
          clientName: landingDemoSaleClient.fullName,
          clientPhone: landingDemoSaleClient.phone,
          account: "cashbox",
          paymentMethod: "cash",
          comment: `${sellLabels.sell} · ${selectedMotor.serialCode}`,
        }}
      />
    </div>
  );
}
