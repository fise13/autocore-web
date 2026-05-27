"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Cloud, Download, Loader2, Sparkles, Upload, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { userCopy } from "@/lib/user-copy";

const benefitIcons = [Cloud, Upload, Download, Users, Sparkles] as const;

export type ProActivationPhase = "activating" | "celebrating";

type ProActivationCelebrationProps = {
  open: boolean;
  phase: ProActivationPhase;
  onOpenChange: (open: boolean) => void;
};

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.22 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: "easeOut" as const },
  },
};

export function ProActivationCelebration({ open, phase, onOpenChange }: ProActivationCelebrationProps) {
  const copy = userCopy.billing.proActivation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={phase === "celebrating"}
        className="overflow-hidden border-primary/15 p-0 sm:max-w-md"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative space-y-5 p-6 pt-7">
          <AnimatePresence mode="wait">
            {phase === "activating" ? (
              <motion.div
                key="activating"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-4 py-6 text-center"
              >
                <div className="relative flex size-16 items-center justify-center">
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-primary/25"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="size-7 animate-spin text-primary" />
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-semibold">{copy.activatingTitle}</p>
                  <p className="text-sm text-muted-foreground">{copy.activatingHint}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="celebrating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <DialogHeader className="items-center space-y-3 text-center">
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  >
                    <Sparkles className="size-7" />
                  </motion.div>
                  <div className="space-y-2">
                    <Badge className="px-2.5">{userCopy.billing.planPro}</Badge>
                    <DialogTitle className="text-xl">{copy.celebrationTitle}</DialogTitle>
                    <DialogDescription className="text-sm">{copy.celebrationSubtitle}</DialogDescription>
                  </div>
                </DialogHeader>

                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  className="mt-2 space-y-2.5"
                >
                  {copy.benefits.map((benefit, index) => {
                    const Icon = benefitIcons[index] ?? Check;
                    return (
                      <motion.li
                        key={benefit.title}
                        variants={itemVariants}
                        className="flex items-start gap-3 rounded-xl border bg-muted/25 p-3"
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 text-left">
                          <span className="block text-sm font-medium">{benefit.title}</span>
                          <span className="block text-xs text-muted-foreground">{benefit.description}</span>
                        </span>
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.35 + index * 0.09, type: "spring", stiffness: 420, damping: 22 }}
                          className="ml-auto mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        >
                          <Check className="size-3.5" strokeWidth={2.5} />
                        </motion.span>
                      </motion.li>
                    );
                  })}
                </motion.ul>

                <DialogFooter className="mt-4 sm:justify-center">
                  <Button className="min-w-[180px]" onClick={() => onOpenChange(false)}>
                    {copy.startButton}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
