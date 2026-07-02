"use client";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { cn } from "@/lib/utils";

const audit = marketingSiteContent.security.auditLog.slice(0, 4);

type ProductSecuritySliceProps = {
  className?: string;
};

export function ProductSecuritySlice({ className }: ProductSecuritySliceProps) {
  return (
    <div className={cn("product-security-slice", className)}>
      <div className="product-security-slice-header">
        <p className="text-sm font-medium">Журнал активности</p>
        <p className="text-xs text-muted-foreground">Realtime · RBAC</p>
      </div>
      <ul className="product-security-audit">
        {audit.map((entry) => (
          <li key={`${entry.time}-${entry.action}`} className="product-security-audit-row">
            <span
              className={cn(
                "product-security-audit-dot",
                entry.severity === "critical" && "is-critical",
                entry.severity === "warn" && "is-warn",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{entry.action}</p>
              <p className="text-[10px] text-muted-foreground">
                {entry.actor} · {entry.module}
              </p>
            </div>
            <time className="exp-mock-mono text-[10px] text-muted-foreground">{entry.time}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}
