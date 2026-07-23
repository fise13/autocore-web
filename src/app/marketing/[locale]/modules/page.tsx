import { getTranslations, setRequestLocale } from "next-intl/server";

import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { ModulesPageContent } from "@/components/marketing/site/modules-page-content";
import { routing } from "@/i18n/routing";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/seo/marketing-seo";
import { isAppLocale } from "@autocore/i18n/config";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  return buildMarketingMetadata("modules", locale);
}

export const revalidate = 3600;

export default async function ModulesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "marketing" });
  const description = t("pages.modules.meta.description");
  const items = t.raw("pages.modules.items") as Array<{ title: string }>;

  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("modules", locale),
          buildBreadcrumbJsonLd("modules", locale),
          buildCollectionPageJsonLd(
            "modules",
            t("seo.pages.modules.title"),
            description,
            items.map((item) => item.title),
          ),
        ]}
      />
      <MarketingSubpage
        title={t("pages.modules.meta.title")}
        description={description}
        breadcrumbLabel={t("seo.breadcrumbs.modules")}
        pathKey="modules"
      >
        <ModulesPageContent />
      </MarketingSubpage>
    </>
  );
}
