import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WorkspaceSectionProps = {
  /** Flat headers when already inside another surface (settings card, shell panel). */
  embedded?: boolean;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** One surface level: card on standalone pages, plain section when nested. */
export function WorkspaceSection({
  embedded = false,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: WorkspaceSectionProps) {
  if (embedded) {
    return (
      <section className={cn("flex flex-col gap-4", className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            {description ? (
              <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className={contentClassName}>{children}</div>
      </section>
    );
  }

  return (
    <Card className={cn("gap-0 shadow-none", className)}>
      <CardHeader
        className={cn(
          "border-b bg-muted/15",
          action && "flex flex-row flex-wrap items-start justify-between gap-3 space-y-0",
        )}
      >
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn("pt-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
