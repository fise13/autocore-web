import Link from "next/link";

import { AppLogo } from "@/components/brand/app-logo";
import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { DesktopDownloadIcons } from "@/components/marketing/desktop-download-buttons";
import { marketingRoutes } from "@/lib/marketing-routes";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import { appDemoUrl, appLoginUrl } from "@/lib/site-urls";

const contacts = getPlatformContacts();
const copy = landingContent.footer;

const FOOTER_LINKS = [
  { label: "Продукт", href: marketingRoutes.product },
  { label: "Модули", href: marketingRoutes.modules },
  { label: "Тарифы", href: marketingRoutes.pricing },
  { label: "Безопасность", href: marketingRoutes.security },
  { label: "Связаться", href: marketingRoutes.contact },
  { label: "Скачать", href: marketingRoutes.download },
  { label: "Конфиденциальность", href: marketingRoutes.privacy },
  { label: "Условия", href: marketingRoutes.terms },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="exp-site-footer mt-auto border-t border-border/60">
      <div className="exp-site-footer-inner mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:py-14">
        <div className="exp-site-footer-top flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="exp-site-footer-brand flex max-w-sm flex-col gap-4">
            <Link href={marketingRoutes.home} className="inline-flex w-fit items-center gap-2.5">
              <AppLogo size={28} />
              <span className="text-sm font-semibold tracking-tight">AutoCore</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">{copy.tagline}</p>
            <DesktopDownloadIcons size="mini" />
          </div>

          <nav aria-label="Подвал" className="exp-site-footer-nav grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="exp-site-footer-bottom flex flex-col gap-3 border-t border-border/50 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} AutoCore</p>
          <div className="exp-site-footer-meta flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href={contacts.mailtoHref} className="hover:text-foreground">
              {contacts.email}
            </a>
            <a href={contacts.telHref} className="hover:text-foreground">
              {contacts.formattedPhone}
            </a>
            <Link href={appDemoUrl()} className="font-medium text-foreground hover:underline">
              Демо
            </Link>
            <Link href={appLoginUrl()} className="hover:text-foreground">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
