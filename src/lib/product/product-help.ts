import { getActiveUserCopyLocale } from "@/lib/user-copy";
import { productHelpSectionsEn } from "@/lib/product/product-help.en";
import { productHelpSectionsRu } from "@/lib/product/product-help.ru";
import type {
  ProductHelpArticle,
  ProductHelpSection,
  ProductHelpSectionId,
} from "@/lib/product/product-help-types";

export type {
  ProductHelpArticle,
  ProductHelpItem,
  ProductHelpSection,
  ProductHelpSectionId,
} from "@/lib/product/product-help-types";

/**
 * Locale-aware help articles. Re-evaluated when AppLocaleProvider remounts on locale change.
 */
export function getProductHelpSections(): ProductHelpSection[] {
  return getActiveUserCopyLocale() === "en" ? productHelpSectionsEn : productHelpSectionsRu;
}

/**
 * Active-locale sections (same remount semantics as `userCopy`).
 * Prefer `getProductHelpSections()` in new code.
 */
export const productHelpSections: ProductHelpSection[] = new Proxy([] as ProductHelpSection[], {
  get(_target, prop, receiver) {
    const sections = getProductHelpSections();
    const value = Reflect.get(sections, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(sections) : value;
  },
  ownKeys() {
    return Reflect.ownKeys(getProductHelpSections());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getProductHelpSections(), prop);
  },
  has(_target, prop) {
    return Reflect.has(getProductHelpSections(), prop);
  },
});

function articleMatches(article: ProductHelpArticle, normalized: string): boolean {
  if (article.q.toLowerCase().includes(normalized)) return true;
  if (article.a.toLowerCase().includes(normalized)) return true;
  if (article.keywords?.some((keyword) => keyword.toLowerCase().includes(normalized))) {
    return true;
  }
  if (article.keywords?.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return true;
  }
  return false;
}

export function filterProductHelpSections(
  sections: ProductHelpSection[],
  query: string,
): ProductHelpSection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return sections;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => articleMatches(item, normalized)),
    }))
    .filter((section) => section.items.length > 0);
}

export function getProductHelpSection(
  sectionId: ProductHelpSectionId | "all",
  sections: ProductHelpSection[] = getProductHelpSections(),
): ProductHelpSection | undefined {
  if (sectionId === "all") return undefined;
  return sections.find((section) => section.id === sectionId);
}

export function countProductHelpArticles(
  sections: ProductHelpSection[] = getProductHelpSections(),
): number {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

/** Popular entry points shown on the help home (no active search). */
export const productHelpPopularIds = [
  "import-price-list",
  "close-work-order",
  "document-import",
  "mobile-scan",
  "role-warehouse-only",
  "company-branding",
] as const;

export function getPopularHelpArticles(
  sections: ProductHelpSection[] = getProductHelpSections(),
): ProductHelpArticle[] {
  const byId = new Map<string, ProductHelpArticle>();
  for (const section of sections) {
    for (const item of section.items) {
      byId.set(item.id, item);
    }
  }
  return productHelpPopularIds
    .map((id) => byId.get(id))
    .filter((article): article is ProductHelpArticle => Boolean(article));
}

export function findHelpArticleSectionId(
  articleId: string,
  sections: ProductHelpSection[] = getProductHelpSections(),
): ProductHelpSectionId | undefined {
  for (const section of sections) {
    if (section.items.some((item) => item.id === articleId)) {
      return section.id;
    }
  }
  return undefined;
}
