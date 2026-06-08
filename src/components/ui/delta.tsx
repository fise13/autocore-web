"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DeltaVariant = "default" | "badge";

type DeltaContextValue = {
  value: number;
};

const DeltaContext = React.createContext<DeltaContextValue | null>(null);

function useDeltaValue() {
  const context = React.useContext(DeltaContext);
  if (!context) {
    throw new Error("DeltaIcon and DeltaValue must be used inside Delta.");
  }
  return context.value;
}

function Delta({
  className,
  value,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  value: number;
  variant?: DeltaVariant;
}) {
  return (
    <DeltaContext.Provider value={{ value }}>
      {variant === "badge" ? (
        <Badge
          variant="secondary"
          data-slot="delta"
          className={cn(
            "gap-1 font-medium tabular-nums",
            value > 0 && "bg-primary/10 text-primary",
            value < 0 && "bg-destructive/10 text-destructive",
            className,
          )}
          {...(props as React.ComponentProps<typeof Badge>)}
        >
          {children}
        </Badge>
      ) : (
        <div
          data-slot="delta"
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
            value > 0 && "text-primary",
            value < 0 && "text-destructive",
            value === 0 && "text-muted-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      )}
    </DeltaContext.Provider>
  );
}

function DeltaIcon({
  variant = "trend",
  className,
}: {
  variant?: "default" | "trend" | "arrow";
  className?: string;
}) {
  const value = useDeltaValue();
  const iconClass = cn("size-3.5 shrink-0", className);

  if (value === 0) {
    return <Minus className={iconClass} aria-hidden />;
  }

  if (value > 0) {
    return variant === "arrow" ? (
      <TrendingUp className={iconClass} aria-hidden />
    ) : (
      <TrendingUp className={iconClass} aria-hidden />
    );
  }

  return variant === "arrow" ? (
    <TrendingDown className={iconClass} aria-hidden />
  ) : (
    <TrendingDown className={iconClass} aria-hidden />
  );
}

function DeltaValue({
  className,
  precision = 1,
  suffix = "%",
  absolute = true,
  ...props
}: React.ComponentProps<"span"> & {
  precision?: number;
  suffix?: string;
  absolute?: boolean;
}) {
  const value = useDeltaValue();
  const formatted = (absolute ? Math.abs(value) : value).toFixed(precision);

  return (
    <span className={cn("tabular-nums", className)} {...props}>
      {formatted}
      {suffix}
    </span>
  );
}

export { Delta, DeltaIcon, DeltaValue };
