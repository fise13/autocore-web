import Link from "next/link";

import { AppLogo } from "@/components/brand/app-logo";
import { DesktopDownloadIcons } from "@/components/marketing/desktop-download-icons";
import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { appDashboardUrl, appLoginUrl, getAppUrl, getMarketingUrl } from "@/lib/site-urls";

const copy = landingCopy.footer;

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 md:flex-row md:items-start md:justify-between md:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <AppLogo size={28} />
            <span className="text-base font-semibold">AutoCore</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.tagline}</p>
          <DesktopDownloadIcons />
        </div>

        <div className="grid gap-10 text-sm sm:grid-cols-2">
          <div>
            <p className="mc-section-label mb-4">{copy.product}</p>
            <ul className="space-y-2.5 text-muted-foreground">
              <li>
                <a href="#mission-control" className="hover:text-foreground">
                  Mission Control
                </a>
              </li>
              <li>
                <a href="#workflows" className="hover:text-foreground">
                  {landingCopy.nav.workflows}
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-foreground">
                  {landingCopy.nav.security}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="mc-section-label mb-4">{copy.access}</p>
            <ul className="space-y-2.5 text-muted-foreground">
              <li>
                <Link href={appLoginUrl()} className="hover:text-foreground">
                  {landingCopy.nav.signIn}
                </Link>
              </li>
              <li>
                <Link href={appDashboardUrl()} className="hover:text-foreground">
                  {landingCopy.nav.openDashboard}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-7xl flex-col gap-2 border-t border-border/40 px-5 pt-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
        <p>© {year} AutoCore</p>
        <p>
          Сайт · {getMarketingUrl().replace(/^https?:\/\//, "")} · Приложение ·{" "}
          {getAppUrl().replace(/^https?:\/\//, "")}
        </p>
      </div>
    </footer>
  );
}
