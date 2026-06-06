import Link from "next/link";
import { Command, LayoutDashboard } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { OperationalPreview } from "@/components/marketing/ui/operational-preview";
import { SectionShell } from "@/components/marketing/ui/section-shell";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = landingCopy.missionControl;

export function MissionControlSection() {
  return (
    <SectionShell id="mission-control" label={copy.label} title={copy.title} description={copy.description}>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-sm">
          <Command className="size-4 text-primary" />
          <span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> — быстрый поиск
          </span>
        </div>
        <Link href={marketingRoutes.modules} className="text-sm font-medium text-primary hover:underline">
          Все модули →
        </Link>
      </div>

      <OperationalPreview large className="w-full" />

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {copy.highlights.map((line) => (
          <li key={line} className="flex gap-3 text-muted-foreground">
            <LayoutDashboard className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
