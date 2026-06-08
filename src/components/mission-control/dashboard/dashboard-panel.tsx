import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type McPanelProps = React.ComponentProps<"article">;

export function McPanel({ className, children, ...props }: McPanelProps) {
  return (
    <article className={cn("mc-module-card flex flex-col", className)} {...props}>
      {children}
    </article>
  );
}

type McPanelHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
  className?: string;
};

export function McPanelHeader({ title, description, badge, className }: McPanelHeaderProps) {
  return (
    <div className={cn("mc-module-header space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {badge}
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function McPanelBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("mc-module-body flex-1", className)}>{children}</div>;
}

/** @deprecated Use McPanel — kept for imports during migration */
export const DashboardCard = McPanel;
