"use client";

import { useTranslations } from "next-intl";

/**
 * Locale-aware marketing subpage copy from `marketing.pages.*`.
 * Sections are lazy getters so a page only resolves the keys it reads
 * (avoids cascading MISSING_MESSAGE noise from unrelated pages).
 */
export function useMarketingPages() {
  const t = useTranslations("marketing.pages");
  const tSeo = useTranslations("marketing.seo");

  return {
    get pricing() {
      return {
        hero: {
          titleLine1: t("pricing.hero.titleLine1"),
          titleLine2: t("pricing.hero.titleLine2"),
          lead: t("pricing.hero.lead"),
        },
        plan: {
          price: t("pricing.plan.price"),
          period: t("pricing.plan.period"),
          yearlyPrice: t("pricing.plan.yearlyPrice"),
          yearlyPeriod: t("pricing.plan.yearlyPeriod"),
          monthlyLabel: t("pricing.plan.monthlyLabel"),
          yearlyLabel: t("pricing.plan.yearlyLabel"),
          intervalAria: t("pricing.plan.intervalAria"),
          note: t("pricing.plan.note"),
          yearlySave: t("pricing.plan.yearlySave"),
        },
        cta: {
          primary: t("pricing.cta.primary"),
          buy: t("pricing.cta.buy"),
          trialDays: t("pricing.cta.trialDays"),
          noCard: t("pricing.cta.noCard"),
        },
        buyModal: {
          title: t("pricing.buyModal.title"),
          body: t("pricing.buyModal.body"),
          email: t("pricing.buyModal.email"),
          close: t("pricing.buyModal.close"),
        },
        closing: {
          line: t("pricing.closing.line"),
          button: t("pricing.closing.button"),
        },
        included: {
          title: t("pricing.included.title"),
          items: t.raw("pricing.included.items") as string[],
        },
        philosophy: {
          title: t("pricing.philosophy.title"),
          statement: t("pricing.philosophy.statement"),
          body: t("pricing.philosophy.body"),
        },
        faqTitle: t("pricing.faqTitle"),
        faq: t.raw("pricing.faq") as Array<{ q: string; a: string }>,
      };
    },
    get modules() {
      return {
        intro: t("modules.intro"),
        capabilitiesTitle: t("modules.capabilitiesTitle"),
        forWhomLabel: t("modules.forWhomLabel"),
        stats: t.raw("modules.stats") as Array<{ value: string; label: string }>,
        items: t.raw("modules.items") as Array<{
          id: string;
          title: string;
          tagline: string;
          description: string;
          capabilities: string[];
          forWhom: string;
        }>,
        relatedLinks: {
          overview: t("modules.relatedLinks.overview"),
          warehouse: t("modules.relatedLinks.warehouse"),
          accounting: t("modules.relatedLinks.accounting"),
          workOrders: t("modules.relatedLinks.workOrders"),
          howItWorks: t("modules.relatedLinks.howItWorks"),
          documents: t("modules.relatedLinks.documents"),
          security: t("modules.relatedLinks.security"),
          demo: t("modules.relatedLinks.demo"),
        },
        relatedSections: {
          product: {
            label: t("modules.relatedSections.product.label"),
            hint: t("modules.relatedSections.product.hint"),
          },
          pricing: {
            label: t("modules.relatedSections.pricing.label"),
            hint: t("modules.relatedSections.pricing.hint"),
          },
          security: {
            label: t("modules.relatedSections.security.label"),
            hint: t("modules.relatedSections.security.hint"),
          },
          contact: {
            label: t("modules.relatedSections.contact.label"),
            hint: t("modules.relatedSections.contact.hint"),
          },
        },
      };
    },
    get security() {
      return {
        hero: {
          title: t("security.hero.title"),
          description: t("security.hero.description"),
        },
        sections: {
          foundationTitle: t("security.sections.foundationTitle"),
          foundationBody: t("security.sections.foundationBody"),
          layersTitle: t("security.sections.layersTitle"),
          layersBody: t("security.sections.layersBody"),
          auditTitle: t("security.sections.auditTitle"),
          auditMeta: t("security.sections.auditMeta"),
          auditBody: t("security.sections.auditBody"),
          principlesTitle: t("security.sections.principlesTitle"),
          checklistTitle: t("security.sections.checklistTitle"),
          checklistBody: t("security.sections.checklistBody"),
          relatedTitle: t("security.sections.relatedTitle"),
          relatedPrivacyTitle: t("security.sections.relatedPrivacyTitle"),
          relatedPrivacyMeta: t("security.sections.relatedPrivacyMeta"),
          relatedTermsTitle: t("security.sections.relatedTermsTitle"),
          relatedTermsMeta: t("security.sections.relatedTermsMeta"),
          relatedContactTitle: t("security.sections.relatedContactTitle"),
          relatedContactMeta: t("security.sections.relatedContactMeta"),
          statsAria: t("security.sections.statsAria"),
          breadcrumbsAria: t("security.sections.breadcrumbsAria"),
        },
        stats: t.raw("security.stats") as Array<{ value: string; label: string }>,
        pillars: t.raw("security.pillars") as Array<{ title: string; body: string }>,
        principles: t.raw("security.principles") as Array<{ title: string; body: string }>,
        stack: t.raw("security.stack") as Array<{ layer: string; detail: string }>,
        auditLog: t.raw("security.auditLog") as Array<{
          time: string;
          actor: string;
          role: string;
          module: string;
          action: string;
          severity: "info" | "warn" | "critical";
        }>,
        checklist: t.raw("security.checklist") as string[],
      };
    },
    get contact() {
      return {
        hero: {
          title: t("contact.hero.title"),
          description: t("contact.hero.description"),
        },
        intentsHeading: t("contact.intentsHeading"),
        methodsHeading: t("contact.methodsHeading"),
        intents: t.raw("contact.intents") as Array<{
          title: string;
          topics: string[];
          mailSubject: string;
        }>,
        methods: {
          emailLabel: t("contact.methods.emailLabel"),
          responseLabel: t("contact.methods.responseLabel"),
          response: t("contact.methods.response"),
          languagesLabel: t("contact.methods.languagesLabel"),
          languages: t.raw("contact.methods.languages") as string[],
        },
        closing: {
          line: t("contact.closing.line"),
          subline: t("contact.closing.subline"),
          button: t("contact.closing.button"),
        },
      };
    },
    get download() {
      return {
        hero: {
          titleLine1: t("download.hero.titleLine1"),
          titleLine2: t("download.hero.titleLine2"),
          description: t("download.hero.description"),
        },
        platformPickerTitle: t("download.platformPickerTitle"),
        faqTitle: t("download.faqTitle"),
        hint: t("download.hint"),
        platforms: t.raw("download.platforms") as Array<{
          id: string;
          title: string;
          description: string;
          action: string;
          kind: string;
        }>,
        ecosystem: {
          title: t("download.ecosystem.title"),
          description: t("download.ecosystem.description"),
        },
        travels: {
          title: t("download.travels.title"),
          items: t.raw("download.travels.items") as string[],
        },
        requirements: {
          title: t("download.requirements.title"),
          items: t.raw("download.requirements.items") as Array<{
            platform: string;
            detail: string;
          }>,
        },
        faq: t.raw("download.faq") as Array<{ q: string; a: string }>,
        closing: {
          line: t("download.closing.line"),
          button: t("download.closing.button"),
        },
      };
    },
    get downloadMobile() {
      return {
        backLabel: t("downloadMobile.backLabel"),
        changeSelection: t("downloadMobile.changeSelection"),
        platformPickerTitle: t("downloadMobile.platformPickerTitle"),
        qrAlt: t("downloadMobile.qrAlt"),
        hero: {
          title: t("downloadMobile.hero.title"),
          description: t("downloadMobile.hero.description"),
        },
        platforms: t.raw("downloadMobile.platforms") as Array<{
          id: string;
          title: string;
          description: string;
          action: string;
        }>,
        reveal: {
          qrLabel: t("downloadMobile.reveal.qrLabel"),
          linkLabel: t("downloadMobile.reveal.linkLabel"),
          placeholderQr: t("downloadMobile.reveal.placeholderQr"),
          placeholderLink: t("downloadMobile.reveal.placeholderLink"),
        },
      };
    },
    get legal() {
      return {
        updatedPrefix: t("legal.updatedPrefix"),
        relatedHeading: t("legal.relatedHeading"),
        relatedDescription: t("legal.relatedDescription"),
        hub: t.raw("legal.hub") as Array<{ label: string; description: string }>,
        relatedContactTitle: t("legal.relatedContactTitle"),
        relatedContactMeta: t("legal.relatedContactMeta"),
      };
    },
    get breadcrumbs() {
      return {
        pricing: tSeo("breadcrumbs.pricing"),
        security: tSeo("breadcrumbs.security"),
        contact: tSeo("breadcrumbs.contact"),
        download: tSeo("breadcrumbs.download"),
        product: tSeo("breadcrumbs.product"),
        modules: tSeo("breadcrumbs.modules"),
        privacy: tSeo("breadcrumbs.privacy"),
        refund: tSeo("breadcrumbs.refund"),
        terms: tSeo("breadcrumbs.terms"),
      };
    },
    get faq() {
      return {
        title: t("faq.title"),
        description: t("faq.description"),
        items: t.raw("faq.items") as Array<{ q: string; a: string }>,
      };
    },
  };
}
