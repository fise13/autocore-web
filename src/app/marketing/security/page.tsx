import type { Metadata } from "next";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { KeyRound, ScrollText, Shield, Users } from "lucide-react";

const copy = landingCopy.pages.securityPage;
const items = landingCopy.security.items;
const ICONS = [Users, ScrollText, Shield, KeyRound] as const;
const TONES = ["blue", "violet", "green", "amber"] as const;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
};

export default function SecurityPage() {
  return (
    <MarketingSubpage title={copy.title} description={copy.description} breadcrumbLabel="Безопасность">
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item, index) => (
          <FeatureCard
            key={item.title}
            icon={ICONS[index] ?? Shield}
            tone={TONES[index] ?? "blue"}
            title={item.title}
            description={item.body}
          />
        ))}
      </div>

      <section className="mt-12 space-y-4 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Принципы</h2>
        <p>Каждое значимое действие фиксируется с указанием сотрудника, роли и времени. Права выдаются по модулям — без лишнего доступа к финансам или настройкам.</p>
        <p>Данные компании изолированы на уровне организации. AutoCore проектируется для многопользовательской эксплуатации в production-среде.</p>
      </section>
    </MarketingSubpage>
  );
}
