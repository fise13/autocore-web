import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "secondary" | "outline";
};

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
};

function EmptyStateButton({ action }: { action: EmptyStateAction }) {
  const variant = action.variant ?? "default";

  if (action.href) {
    return (
      <Link href={action.href} className={cn(buttonVariants({ variant }))}>
        {action.label}
      </Link>
    );
  }

  return (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <Icon className="mb-3 size-5 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {primaryAction || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {primaryAction ? <EmptyStateButton action={primaryAction} /> : null}
          {secondaryAction ? <EmptyStateButton action={secondaryAction} /> : null}
        </div>
      ) : null}
    </div>
  );
}
