"use client";

import { useTranslations } from "next-intl";

export type ProductSectionId =
  | "engine-search"
  | "sale"
  | "work-order"
  | "documents"
  | "finance"
  | "mobile"
  | "ai";

type TocItem = { id: ProductSectionId; label: string };

/**
 * Locale-aware product page copy. Mirrors the historical `productContent` shape so
 * section components only need to swap the import for this hook.
 */
export function useProductContent() {
  const t = useTranslations("marketing.product");

  return {
    hero: {
      title: t("hero.title"),
      subtitle: t("hero.subtitle"),
    },
    toc: {
      title: t("toc.title"),
      items: t.raw("toc.items") as TocItem[],
    },
    sections: {
      "engine-search": {
        id: "engine-search" as const,
        title: t("sections.engineSearch.title"),
        question: t("sections.engineSearch.question"),
        line: t("sections.engineSearch.line"),
        searchPrompt: t("sections.engineSearch.searchPrompt"),
      },
      sale: {
        id: "sale" as const,
        title: t("sections.sale.title"),
        question: t("sections.sale.question"),
        line: t("sections.sale.line"),
        sellLabel: t("sections.sale.sellLabel"),
        cascade: t.raw("sections.sale.cascade") as string[],
        replay: t("sections.sale.replay"),
        closeDocument: t("sections.sale.closeDocument"),
      },
      "work-order": {
        id: "work-order" as const,
        title: t("sections.workOrder.title"),
        question: t("sections.workOrder.question"),
        line: t("sections.workOrder.line"),
      },
      documents: {
        id: "documents" as const,
        title: t("sections.documents.title"),
        question: t("sections.documents.question"),
        line: t("sections.documents.line"),
      },
      finance: {
        id: "finance" as const,
        title: t("sections.finance.title"),
        question: t("sections.finance.question"),
        line: t("sections.finance.line"),
      },
      mobile: {
        id: "mobile" as const,
        title: t("sections.mobile.title"),
        question: t("sections.mobile.question"),
        line: t("sections.mobile.line"),
      },
      ai: {
        id: "ai" as const,
        title: t("sections.ai.title"),
        question: t("sections.ai.question"),
        line: t("sections.ai.line"),
      },
    },
    cta: {
      titleLine1: t("cta.titleLine1"),
      titleLine2: t("cta.titleLine2"),
      primary: t("cta.primary"),
      secondary: t("cta.secondary"),
    },
  };
}

export type ProductContent = ReturnType<typeof useProductContent>;
