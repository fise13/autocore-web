"use client";

import { Barcode, Check, ChevronLeft, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { KeynoteSceneSnapshot } from "@/components/marketing/download/ecosystem/use-ecosystem-keynote-timeline";
import { cn } from "@/lib/utils";

type KeynotePhoneUiProps = {
  snapshot: KeynoteSceneSnapshot;
};

export function KeynotePhoneUi({ snapshot }: KeynotePhoneUiProps) {
  const reduced = useReducedMotion();
  const scanning = snapshot.phoneStatus === "scanning";
  const sending = snapshot.phoneStatus === "sending";
  const sent = snapshot.phoneStatus === "sent";
  const scanned = snapshot.phoneStatus === "scanned" || sending || sent;
  const ready = snapshot.phoneStatus === "scanned" && !snapshot.reservePressed;

  return (
    <div className="keynote-phone-ui">
      <nav className="keynote-phone-nav" aria-hidden>
        <ChevronLeft className="size-3.5 opacity-55" aria-hidden />
        <span className="keynote-phone-nav-title">Склад</span>
        <span
          className={cn(
            "keynote-phone-nav-badge",
            scanning && "is-scanning",
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
          ) : scanning ? (
            "Сканирование"
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

      <div
        className={cn(
          "keynote-phone-scan",
          scanning && "is-scanning",
          scanned && "is-done",
        )}
      >
        {scanning && !reduced ? (
          <motion.span
            className="keynote-phone-scan-line"
            aria-hidden
            animate={{ top: ["18%", "78%", "18%"] }}
            transition={{ duration: 1.35, ease: "easeInOut", repeat: Infinity }}
          />
        ) : null}
        <Barcode className="keynote-phone-scan-icon" aria-hidden />
        <p className="keynote-phone-scan-label">
          {scanning ? "Сканируем код…" : scanned ? "VIN распознан" : "Наведите на код"}
        </p>
      </div>

      <div className="keynote-phone-vin">
        <span className="keynote-phone-vin-label">VIN</span>
        <motion.span
          key={snapshot.vin}
          className="keynote-phone-vin-value"
          initial={reduced ? false : { opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28 }}
        >
          {snapshot.vin}
        </motion.span>
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
            <span>На desktop</span>
          </motion.div>
        ) : scanning ? (
          <motion.div
            key="scanning-wait"
            className="keynote-phone-complete is-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span>Ожидание VIN…</span>
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
