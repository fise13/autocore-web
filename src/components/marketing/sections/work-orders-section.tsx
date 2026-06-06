import { FileOutput, UserRound, Wrench } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { SectionShell } from "@/components/marketing/ui/section-shell";

const copy = landingCopy.workOrders;
const ICONS = [Wrench, UserRound, FileOutput] as const;
const TONES = ["blue", "green", "amber"] as const;

export function WorkOrdersSection() {
  return (
    <SectionShell id="work-orders" label={copy.label} title={copy.title} description={copy.description}>
      <div className="grid gap-4 md:grid-cols-3">
        {copy.cards.map((card, index) => (
          <FeatureCard
            key={card.title}
            icon={ICONS[index] ?? Wrench}
            tone={TONES[index] ?? "blue"}
            title={card.title}
            description={card.steps.join(" · ")}
          />
        ))}
      </div>
    </SectionShell>
  );
}
