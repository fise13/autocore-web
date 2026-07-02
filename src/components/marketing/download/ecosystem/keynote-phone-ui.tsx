"use client";

import { Barcode, Check, ChevronLeft, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { KeynoteSceneSnapshot } from "@/components/marketing/download/ecosystem/use-ecosystem-keynote-timeline";
import { cn } from "@/lib/utils";

type KeynotePhoneUiProps = {
  snapshot: KeynoteSceneSnapshot;
};

export function KeynotePhoneUi({ snapshot }: KeynotePhoneUiProps) {
  const sending = snapshot.phoneStatus === "sending";
  const sent = snapshot.phoneStatus === "sent";
  const ready = snapshot.phoneStatus === "scanned" && !snapshot.reservePressed;

  return (
    <div className="keynote-phone-ui">
      <nav className="keynote-phone-nav" aria-hidden>
        <ChevronLeft className="size-3.5 opacity-55" aria-hidden />
        <span className="keynote-phone-nav-title">Склад</span>
        <span
          className={cn(
            "keynote-phone-nav-badge",
            sending && "is-sending",
            sent && "is-sent",
          )}
        >
          {sent ? (
            <>
              <Check className="size-2.5" aria-hidden />
              Отправлено
            </>
          ) : sending ? (
            <>
              <Loader2 className="size-2.5 animate-spin" aria-hidden />
              Отправка…
            </>
          ) : (
            "VIN готов"
          )}
        </span>
      </nav>

      <div className="keynote-phone-ui-header">
        <div>
          <p className="keynote-phone-ui-title">G4KC · 2.4L</p>
          <p className="keynote-phone-ui-meta">Двигатель · полка A-12</p>
        </div>
      </div>

      <div className={cn("keynote-phone-scan", "is-done")}>
        <Barcode className="keynote-phone-scan-icon" aria-hidden />
        <p className="keynote-phone-scan-label">VIN распознан</p>
      </div>

      <div className="keynote-phone-vin">
        <span className="keynote-phone-vin-label">VIN</span>
        <span className="keynote-phone-vin-value">{snapshot.vin}</span>
      </div>

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            className="keynote-phone-complete"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Check className="size-3.5" aria-hidden />
            <span>Отправлено</span>
          </motion.div>
        ) : (
          <motion.button
            key="action"
            type="button"
            className={cn(
              "keynote-phone-send",
              ready && "is-ready",
              snapshot.reservePressed && "is-pressed",
              sending && "is-sending",
            )}
            tabIndex={-1}
            aria-hidden
          >
            {sending ? "Отправка…" : "Резерв"}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
