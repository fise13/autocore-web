import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EnterprisePanelCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  borderedHeader?: boolean;
};

export function EnterprisePanelCard({
  title,
  description,
  action,
  footer,
  children,
  className,
  contentClassName,
  borderedHeader = true,
}: EnterprisePanelCardProps) {
  return (
    <Card className={cn("gap-0 overflow-hidden shadow-none dark:ring-0", className)}>
      <CardHeader
        className={cn(
          borderedHeader && "border-b bg-muted/20",
          action && "flex flex-row items-start justify-between gap-3 space-y-0",
        )}
      >
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn("p-0", contentClassName)}>{children}</CardContent>
      {footer ? <CardFooter className="border-t bg-muted/10 py-3">{footer}</CardFooter> : null}
    </Card>
  );
}
