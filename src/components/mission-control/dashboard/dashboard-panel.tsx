import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type McPanelProps = React.ComponentProps<typeof Card>;

export function McPanel({ className, children, ...props }: McPanelProps) {
  return (
    <Card className={cn("flex flex-col gap-0 shadow-none dark:ring-0", className)} {...props}>
      {children}
    </Card>
  );
}

type McPanelHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
  bordered?: boolean;
};

export function McPanelHeader({
  title,
  description,
  badge,
  action,
  className,
  bordered = false,
}: McPanelHeaderProps) {
  return (
    <CardHeader
      className={cn(
        bordered && "border-b bg-muted/20",
        action && "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className={cn(!action && "text-base")}>{title}</CardTitle>
          {badge}
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </div>
      {action}
    </CardHeader>
  );
}

export function McPanelBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <CardContent className={cn("flex-1", className)}>{children}</CardContent>;
}

/** @deprecated Use McPanel — kept for imports during migration */
export const DashboardCard = McPanel;
