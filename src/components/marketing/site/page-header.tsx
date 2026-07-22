"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { useGsapMountReveal } from "@/components/marketing/motion/use-gsap-reveal";
import { Link } from "@/i18n/navigation";
import type { MarketingPathname } from "@/i18n/routing";

type Breadcrumb = { label: string; href?: MarketingPathname };

type PageHeaderProps = {
  title: string;
  description: string;
  breadcrumbs?: Breadcrumb[];
  eyebrow?: string;
};

export function PageHeader({ title, description, breadcrumbs, eyebrow }: PageHeaderProps) {
  const t = useTranslations("marketing");
  const ref = useRef<HTMLElement>(null);
  useGsapMountReveal(ref, "[data-header-reveal]", { stagger: 0.09, y: 16 });

  return (
    <header ref={ref} className="marketing-page-header">
      <div className="landing-container">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            className="marketing-breadcrumbs"
            aria-label={t("a11y.legal.breadcrumbsAria")}
            data-header-reveal
          >
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="inline-flex items-center gap-1.5">
                {index > 0 ? <ChevronRight className="size-3.5 opacity-40" aria-hidden /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        {eyebrow ? (
          <p className="landing-eyebrow mt-6" data-header-reveal>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="marketing-page-title" data-header-reveal>
          {title}
        </h1>
        <p className="landing-lead mt-5 max-w-2xl" data-header-reveal>
          {description}
        </p>
      </div>
    </header>
  );
}
