export type ProductHelpSectionId =
  | "getting-started"
  | "warehouse"
  | "motors"
  | "work-orders"
  | "finance"
  | "documents"
  | "mobile"
  | "team";

export type ProductHelpArticle = {
  id: string;
  q: string;
  a: string;
  /** Extra tokens for search (lowercase optional; matched case-insensitively). */
  keywords?: string[];
  /** In-app deep link when the answer points to a concrete screen. */
  href?: string;
  hrefLabel?: string;
};

export type ProductHelpSection = {
  id: ProductHelpSectionId;
  title: string;
  description: string;
  items: ProductHelpArticle[];
};

/** @deprecated Prefer ProductHelpArticle; kept for older imports/tests. */
export type ProductHelpItem = ProductHelpArticle;
