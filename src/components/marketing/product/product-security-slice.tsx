"use client";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import { cn } from "@/lib/utils";

type ProductSecuritySliceProps = {
  className?: string;
};

export function ProductSecuritySlice({ className }: ProductSecuritySliceProps) {
  const chrome = useDemoChrome();
  const audit = useMarketingPages().security.auditLog.slice(0, 5);

  return (
    <div className={cn("product-security-slice", className)}>
      <div className="product-security-slice-header">
        <div>
          <p className="text-sm font-medium">{chrome.security.activityLog}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{chrome.security.whoWhatWhen}</p>
        </div>
        <p className="text-[10px] font-medium tracking-wide text-primary uppercase">Realtime · RBAC</p>
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
