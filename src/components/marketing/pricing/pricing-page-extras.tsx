"use client";

import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { useRef } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingFaq } from "@/components/marketing/site/marketing-faq";
import { MarketingSection } from "@/components/marketing/site/marketing-section";
import { useGsapReveal } from "@/components/marketing/motion/use-gsap-reveal";
import { marketingRoutes } from "@/lib/marketing-routes";
import { Button } from "@/components/ui/button";

const copy = marketingSiteContent.pricing;

const pricingFaqItems = [
  {
    q: "Нужна ли карта для пробного периода?",
    a: "Нет. Регистрируетесь, создаёте компанию и работаете 14 дней без привязки карты.",
  },
  {
    q: "Можно ли перейти с Pro на Enterprise позже?",
    a: "Да. Напишите нам — поможем с несколькими точками и расширенным онбордингом.",
  },
  ...marketingSiteContent.faq.items.slice(0, 2),
];

function CompareCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto size-4 text-primary" aria-label="Да" />;
  if (value === false) return <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Нет" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

export function PricingPageExtras() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, "[data-pricing-extra]", { stagger: 0.1 });

  return (
    <div ref={ref}>
      <MarketingSection title={copy.compare.title} className="mt-20">
        <div className="marketing-pricing-table-wrap overflow-x-auto" data-pricing-extra>
          <table className="marketing-pricing-table">
            <thead>
              <tr>
                <th>Функция</th>
                <th>Пробный</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {copy.compare.rows.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td>
                    <CompareCell value={row.trial} />
                  </td>
                  <td>
                    <CompareCell value={row.pro} />
                  </td>
                  <td>
                    <CompareCell value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MarketingSection>

      <MarketingSection title="Вопросы о тарифах" className="mt-16">
        <div data-pricing-extra>
          <MarketingFaq items={pricingFaqItems} />
        </div>
      </MarketingSection>

      <div className="mt-12 flex justify-center" data-pricing-extra>
        <Button variant="ghost" render={<Link href={marketingRoutes.product} />}>
          Сначала посмотреть продукт
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
