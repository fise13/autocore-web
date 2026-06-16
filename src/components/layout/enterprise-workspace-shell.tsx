"use client";

import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type EnterpriseWorkspaceShellProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function EnterpriseWorkspaceShell({
  title,
  description,
  action,
  meta,
  children,
  className,
}: EnterpriseWorkspaceShellProps) {
  return (
    <div
      className={cn(
        "animate-autocore-page-enter mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col motion-reduce:animate-none",
        className,
      )}
    >
      <header className="flex flex-col gap-4 px-4 pb-5 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              AutoCore
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
        {meta}
        <Separator />
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-6 sm:px-6">{children}</div>
    </div>
  );
}
