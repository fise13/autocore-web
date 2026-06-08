import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type FeatureIconTone = "blue" | "green" | "amber" | "violet" | "neutral";

const toneClasses: Record<FeatureIconTone, string> = {
  blue: "border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  green: "border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  amber: "border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  violet: "border-violet-200/80 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
  neutral: "border-border bg-muted/60 text-foreground/80",
};

type FeatureIconProps = {
  icon: LucideIcon;
  tone?: FeatureIconTone;
  size?: "md" | "lg";
  className?: string;
};

export function FeatureIcon({ icon: Icon, tone = "blue", size = "md", className }: FeatureIconProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border shadow-sm",
        size === "lg" ? "size-12" : "size-11",
        toneClasses[tone],
        className,
      )}
      aria-hidden
    >
      <Icon className={size === "lg" ? "size-6" : "size-5"} strokeWidth={1.75} />
    </div>
  );
}
