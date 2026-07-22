"use client";

import { useTranslations } from "next-intl";

import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type FaqItem = { q: string; a: string };

type MarketingFaqProps = {
  items?: readonly FaqItem[];
  className?: string;
  /** Efferd faqs-1 layout with heading and footer link */
  variant?: "accordion" | "section";
  title?: string;
  description?: string;
  showFooter?: boolean;
};

function MarketingFaqAccordion({
  items,
  className,
}: {
  items: readonly FaqItem[];
  className?: string;
}) {
  return (
    <Accordion
      defaultValue={items.length > 0 ? ["item-0"] : undefined}
      className={cn("marketing-faq-accordion rounded-xl border border-landing-border bg-card/40", className)}
    >
      {items.map((item, index) => (
        <AccordionItem key={item.q} value={`item-${index}`} className="px-4 md:px-5">
          <AccordionTrigger className="py-4 text-[0.9375rem] font-medium hover:no-underline focus-visible:underline focus-visible:ring-0 md:text-base">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground md:pb-5 md:text-[0.9375rem]">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function MarketingFaq({
  items,
  className,
  variant = "accordion",
  title,
  description,
  showFooter = true,
}: MarketingFaqProps) {
  const t = useTranslations("marketing.pages.faq");
  const faq = useMarketingPages().faq;
  const resolvedItems = items ?? faq.items;
  const resolvedTitle = title ?? faq.title;
  const resolvedDescription = description ?? faq.description;

  if (variant === "section") {
    return (
      <div className={cn("marketing-faq-section mx-auto w-full max-w-2xl space-y-7", className)}>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{resolvedTitle}</h2>
          <p className="max-w-2xl text-muted-foreground">{resolvedDescription}</p>
        </div>

        <MarketingFaqAccordion items={resolvedItems} />

        {showFooter ? (
          <p className="text-sm text-muted-foreground">
            {t("notFoundAnswer")}{" "}
            <Link className="font-medium text-primary hover:underline" href="/contact">
              {t("contactSupport")}
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("marketing-faq mx-auto w-full max-w-2xl", className)}>
      <MarketingFaqAccordion items={resolvedItems} />
    </div>
  );
}
