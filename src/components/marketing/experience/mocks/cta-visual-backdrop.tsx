"use client";

import { cn } from "@/lib/utils";

type CtaVisualBackdropProps = {
  className?: string;
};

/** Two static skeleton fragments — decoration only, never competes with copy. */
const FRAGMENTS = [
  {
    id: "left",
    className:
      "left-[6%] top-[20%] h-[9.5rem] w-[min(38vw,14rem)] max-lg:hidden",
  },
  {
    id: "right",
    className:
      "right-[7%] bottom-[18%] h-[7.5rem] w-[min(32vw,11rem)] max-sm:hidden",
  },
] as const;

export function CtaVisualBackdrop({ className }: CtaVisualBackdropProps) {
  return (
    <div className={cn("exp-cta-backdrop", className)} aria-hidden>
      <div className="exp-cta-vignette" />
      {FRAGMENTS.map((fragment) => (
        <div key={fragment.id} className={cn("exp-cta-fragment absolute rounded-xl", fragment.className)}>
          <div className="exp-cta-fragment-bar w-[42%]" />
          <div className="exp-cta-fragment-bar mt-3 w-full" />
          <div className="exp-cta-fragment-bar mt-2 w-[72%]" />
          <div className="exp-cta-fragment-bar mt-2 w-[55%]" />
        </div>
      ))}
    </div>
  );
}
