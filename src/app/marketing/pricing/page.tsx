import type { Metadata } from "next";
import Link from "next/link";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { appDashboardUrl } from "@/lib/site-urls";
import { Button } from "@/components/ui/button";

const copy = landingCopy.pages.pricing;

const PLANS: Array<{
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}> = [
  {
    name: "Пробный",
    price: "Бесплатно",
    description: "Ознакомление с Mission Control и базовыми модулями.",
    features: ["Mission Control", "Ограниченный склад", "До 3 пользователей"],
  },
  {
    name: "Pro",
    price: "По подписке",
    description: "Полный операционный контур для растущей команды.",
    features: ["Все модули", "Realtime-синхронизация", "Роли и аудит", "Приоритетная поддержка"],
    highlighted: true,
  },
];

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
};

export default function PricingPage() {
  return (
    <MarketingSubpage title={copy.title} description={copy.description} breadcrumbLabel="Тарифы">
      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={
              plan.highlighted
                ? "rounded-2xl border-2 border-primary/30 bg-card p-8 shadow-md"
                : "autocore-metric-card p-8"
            }
          >
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-2xl font-semibold text-primary">{plan.price}</p>
            <p className="mt-3 text-muted-foreground">{plan.description}</p>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f}>— {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        Актуальные цены и оплата — в приложении после входа.{" "}
        <Button variant="link" className="h-auto p-0" render={<Link href={appDashboardUrl()} />}>
          Открыть панель
        </Button>
      </p>
    </MarketingSubpage>
  );
}
