import { LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { motionStagger } from "@/lib/motion";

type MetricCardProps = {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "green" | "blue" | "amber" | "red";
  index?: number;
  className?: string;
};

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-foreground",
  green: "text-emerald-600 dark:text-emerald-400",
  blue: "text-blue-600 dark:text-blue-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
};

export function MetricCard({
  label,
  value,
  suffix = " ₸",
  hint,
  icon: Icon,
  tone = "default",
  index = 0,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "autocore-metric-card animate-autocore-fade-in-up flex flex-col gap-1.5 p-3",
        className,
      )}
      style={{ animationDelay: motionStagger(index) }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {Icon ? <Icon className={cn("size-3.5 opacity-70", toneClasses[tone])} /> : null}
      </div>
      <p className={cn("text-xl font-semibold tabular-nums tracking-tight", toneClasses[tone])}>
        <AnimatedNumber value={value} format={(n) => `${n.toLocaleString("ru-RU")}${suffix}`} />
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
