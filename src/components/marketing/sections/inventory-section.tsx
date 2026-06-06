import Link from "next/link";
import { Barcode, Grid3x3, Sparkles, Table2 } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { SectionShell } from "@/components/marketing/ui/section-shell";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = landingCopy.inventory;
const ICONS = [Table2, Barcode, Sparkles, Grid3x3] as const;
const TONES = ["blue", "green", "amber", "blue"] as const;

export function InventorySection() {
  return (
    <SectionShell id="inventory" label={copy.label} title={copy.title} description={copy.description}>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {copy.features.map((item, index) => (
            <FeatureCard
              key={item.title}
              icon={ICONS[index] ?? Table2}
              tone={TONES[index] ?? "blue"}
              title={item.title}
              description={item.body}
            />
          ))}
        </div>

        <div className="site-preview-frame flex flex-col overflow-hidden">
          <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-medium">{copy.gridHeader}</div>
          <div className="flex-1 divide-y divide-border">
            {landingCopy.marquee.skus.map((row) => (
              <div
                key={row}
                className="flex items-center justify-between px-4 py-3 font-mono text-xs text-muted-foreground"
              >
                <span>{row}</span>
                <span className="text-emerald-600">синхр.</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <Link href={marketingRoutes.modules} className="text-primary hover:underline">
              Подробнее о складе →
            </Link>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
