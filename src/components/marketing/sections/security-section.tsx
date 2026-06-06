import Link from "next/link";
import { KeyRound, ScrollText, Shield, Users } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { SectionShell } from "@/components/marketing/ui/section-shell";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = landingCopy.security;
const ICONS = [Users, ScrollText, Shield, KeyRound] as const;
const TONES = ["blue", "violet", "green", "amber"] as const;

export function SecuritySection() {
  return (
    <SectionShell id="security" label={copy.label} title={copy.title} description={copy.description}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {copy.items.map((item, index) => (
          <FeatureCard
            key={item.title}
            icon={ICONS[index] ?? Shield}
            tone={TONES[index] ?? "blue"}
            title={item.title}
            description={item.body}
            href={index === 0 ? marketingRoutes.security : undefined}
          />
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href={marketingRoutes.security} className="font-medium text-primary hover:underline">
          Полная информация о безопасности →
        </Link>
      </p>
    </SectionShell>
  );
}
