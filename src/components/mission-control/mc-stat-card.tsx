"use client";

import type { LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/ui/delta";
import { cn } from "@/lib/utils";

type McStatCardProps = {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  delta?: number;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "amber" | "destructive";
  className?: string;
};

const toneValueClass: Record<NonNullable<McStatCardProps["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  amber: "text-amber-600 dark:text-amber-400",
  destructive: "text-destructive",
};

export function McStatCard({
  label,
  value,
  suffix = "",
  hint,
  delta,
  icon: Icon,
  tone = "default",
  className,
}: McStatCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "mc-stat-card transition-[transform,box-shadow,border-color] duration-200 ease-out hover:border-primary/25 hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-normal text-muted-foreground">
          <span>{label}</span>
          {Icon ? <Icon className={cn("size-4 opacity-70", toneValueClass[tone])} aria-hidden /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", toneValueClass[tone])}>
          <AnimatedNumber
            value={value}
            format={(n) => `${n.toLocaleString("ru-RU")}${suffix}`}
          />
        </p>
      </CardContent>
      {delta != null || hint ? (
        <CardFooter className="gap-2 border-t-0 bg-transparent pt-0">
          {delta != null ? (
            <Delta value={delta}>
              <DeltaIcon variant="trend" />
              <DeltaValue />
            </Delta>
          ) : null}
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
