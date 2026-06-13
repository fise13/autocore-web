import Link from "next/link";
import { ArrowRight, Monitor } from "lucide-react";

import {
  DesktopDownloadButtons,
  DesktopDownloadHint,
} from "@/components/marketing/desktop-download-buttons";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { getDesktopDownloadLinks } from "@/lib/desktop/desktop-downloads";
import { marketingRoutes } from "@/lib/marketing-routes";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";
import { appLoginUrl } from "@/lib/site-urls";
import { Button } from "@/components/ui/button";

export const metadata = buildMarketingMetadata("download");

export const revalidate = 3600;

export default function DownloadPage() {
  const links = getDesktopDownloadLinks();
  const contacts = getPlatformContacts();

  return (
    <>
      <MarketingExtraJsonLd extra={[buildBreadcrumbJsonLd("download")]} />
      <MarketingSubpage
        title="Скачать AutoCore"
        description="Нативное приложение для macOS и Windows — склад, наряды и документы работают офлайн, синхронизация с облаком в фоне."
        breadcrumbLabel="Скачать"
        eyebrow="Desktop"
      >
        <div className="marketing-channel-card is-featured mx-auto max-w-2xl">
          <span className="marketing-channel-icon" aria-hidden>
            <Monitor className="size-5" strokeWidth={1.75} />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Выберите платформу</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Скачайте установщик, откройте его и перетащите AutoCore в «Программы» (macOS) или следуйте мастеру
            установки (Windows). Вход — через {links.appLoginUrl.replace(/^https?:\/\//, "")}.
          </p>
          <div className="mt-6">
            <DesktopDownloadButtons layout="stack" size="lg" />
          </div>
          <DesktopDownloadHint className="mt-5" />
        </div>

        <div className="mx-auto mt-12 max-w-2xl rounded-xl border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Нужна помощь с установкой?{" "}
            <a href={contacts.mailtoHref} className="font-medium text-primary hover:underline">
              {contacts.email}
            </a>
            {" · "}
            <a href={contacts.telHref} className="font-medium text-primary hover:underline">
              {contacts.formattedPhone}
            </a>
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" render={<Link href={marketingRoutes.contact} />}>
              Контакты
            </Button>
            <Button render={<Link href={appLoginUrl()} />}>
              Открыть веб-приложение
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </MarketingSubpage>
    </>
  );
}
