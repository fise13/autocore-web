import { Laptop, Monitor, Smartphone } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { SectionShell } from "@/components/marketing/ui/section-shell";

const copy = landingCopy.platform;
const ICONS = [Monitor, Laptop, Smartphone] as const;

export function CrossPlatformSection() {
  return (
    <SectionShell
      id="platform"
      label={copy.label}
      title={copy.title}
      description={copy.description}
      align="center"
    >
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {landingCopy.marquee.platforms.map((name) => (
          <span key={name} className="site-chip site-chip-neutral px-4 py-2 text-sm">
            {name}
          </span>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {copy.items.map((platform, index) => (
          <FeatureCard
            key={platform.name}
            icon={ICONS[index] ?? Monitor}
            tone="blue"
            title={platform.name}
            description={platform.detail}
          />
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-2xl text-center text-muted-foreground">{copy.footnote}</p>
    </SectionShell>
  );
}
