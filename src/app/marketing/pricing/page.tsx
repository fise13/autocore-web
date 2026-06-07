import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appLoginUrl } from "@/lib/site-urls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const copy = landingCopy.pages.pricing;

const PLANS: Array<{
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}> = [
  {
    name: "Пробный",
    price: "0 ₽",
    period: "14 дней",
    description: "Оцените Mission Control и базовые модули без обязательств.",
    features: ["Mission Control", "Склад и импорт", "До 3 пользователей", "Поддержка по email"],
  },
  {
    name: "Pro",
    price: "По подписке",
    period: "месяц / год",
    description: "Полный операционный контур для растущей команды автобизнеса.",
    features: [
      "Все модули без ограничений",
      "Realtime на всех устройствах",
      "Роли, аудит, журнал",
      "Приоритетная поддержка",
    ],
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
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "landing-card flex flex-col p-8",
                plan.highlighted && "border-primary/30 ring-1 ring-primary/15",
              )}
            >
              {plan.highlighted ? (
                <span className="mb-4 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Рекомендуем
                </span>
              ) : null}
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{plan.price}</p>
              {plan.period ? <p className="text-sm text-muted-foreground">{plan.period}</p> : null}
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                render={<Link href={appLoginUrl()} />}
              >
                {plan.highlighted ? "Начать с Pro" : "Попробовать бесплатно"}
              </Button>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Нужен корпоративный доступ или несколько точек?{" "}
          <Link href={marketingRoutes.contact} className="font-medium text-primary hover:underline">
            Напишите нам
          </Link>
          {" · "}
          <Link href={marketingRoutes.modules} className="font-medium text-primary hover:underline">
            Что входит в модули
          </Link>
        </p>

        <div className="mt-8 flex justify-center">
          <Button variant="ghost" render={<Link href={marketingRoutes.product} />}>
            Сначала посмотреть продукт
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </MarketingSubpage>
  );
}
