"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { storePreferredLocale } from "@/lib/locale/preferred-locale";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@autocore/i18n/config";
import { getLocaleMetadata } from "@autocore/i18n/config";

type LanguageSwitcherProps = {
  className?: string;
};

/** Compact EN | RU switcher — preserves the current marketing path. */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const t = useTranslations("marketing");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();

  return (
    <nav
      className={cn("marketing-lang-switcher inline-flex items-center gap-1 text-sm", className)}
      aria-label={t("common.language")}
    >
      {routing.locales.map((item, index) => {
        const meta = getLocaleMetadata(item);
        const active = item === locale;
        return (
          <span key={item} className="inline-flex items-center gap-1">
            {index > 0 ? (
              <span className="text-muted-foreground/50" aria-hidden>
                |
              </span>
            ) : null}
            <Link
              href={pathname}
              locale={item}
              hrefLang={meta.bcp47}
              onClick={() => storePreferredLocale(item)}
              className={cn(
                "rounded px-1.5 py-0.5 font-medium tracking-wide uppercase transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "true" : undefined}
            >
              {item}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
