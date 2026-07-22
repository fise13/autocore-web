"use client";

import { useTranslations } from "next-intl";

import { siteNavigation } from "@/components/marketing/site/site-navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ProductNavMenuProps = {
  onNavigate?: () => void;
  className?: string;
};

export function ProductNavMenu({ onNavigate, className }: ProductNavMenuProps) {
  const t = useTranslations("marketing");
  const { productGroup } = siteNavigation;

  return (
    <nav className={cn("marketing-product-nav-minimal", className)} aria-label={t("nav.productMenu.label")}>
      <ul className="marketing-product-nav-minimal-list">
        {productGroup.items.map((item) => (
          <li key={item.key}>
            <Link href={item.href} onClick={onNavigate} className="marketing-product-nav-minimal-link">
              {t(`nav.productMenu.items.${item.key}.label`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
