import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { StatusStyle, StatusTone } from "@/lib/status/status-tones";
import { cn } from "@/lib/utils";

const toneVariant: Record<StatusTone, "neutral" | "info" | "success" | "warning" | "danger"> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, "variant" | "children"> & {
  /** Entry from a registry in `@/lib/status/status-tones`. */
  status: StatusStyle;
  /** Localized status label. Always shown: colour is never the only signal. */
  label: ReactNode;
  /** Show the status icon (use in compact cells where the label may truncate). */
  showIcon?: boolean;
};

export function StatusBadge({ status, label, showIcon = false, className, ...props }: StatusBadgeProps) {
  const Icon = status.icon;
  return (
    <Badge
      variant={toneVariant[status.tone]}
      data-status-tone={status.tone}
      className={cn("shrink-0", className)}
      {...props}
    >
      {showIcon ? <Icon data-icon="inline-start" aria-hidden="true" /> : null}
      {label}
    </Badge>
  );
}
