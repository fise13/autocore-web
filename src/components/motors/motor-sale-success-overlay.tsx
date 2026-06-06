"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect } from "react";

type MotorSaleSuccessOverlayProps = {
  open: boolean;
  serialCode: string;
  amount: number;
  onClose: () => void;
};

export function MotorSaleSuccessOverlay({ open, serialCode, amount, onClose }: MotorSaleSuccessOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/75 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border bg-card p-8 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: 18 }).map((_, index) => (
                <motion.span
                  key={index}
                  className="absolute size-1.5 rounded-full bg-primary/80"
                  initial={{
                    opacity: 0,
                    x: "50%",
                    y: "40%",
                    scale: 0,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: `${20 + Math.random() * 60}%`,
                    y: `${10 + Math.random() * 70}%`,
                    scale: [0, 1.2, 0],
                  }}
                  transition={{ duration: 1.2, delay: index * 0.04, ease: "easeOut" }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 420, damping: 18 }}
              className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
            >
              <CheckCircle2 className="size-9" />
              <Sparkles className="absolute -right-1 -top-1 size-5 text-amber-500" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="text-lg font-semibold tracking-tight"
            >
              Мотор продан
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-1 text-sm text-muted-foreground"
            >
              {serialCode}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="mt-3 text-2xl font-semibold tabular-nums text-emerald-600"
            >
              +{amount.toLocaleString("ru-RU")} ₸
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.34 }}
              className="mt-4 text-xs text-muted-foreground"
            >
              Гарантия и документы формируются автоматически
            </motion.p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
