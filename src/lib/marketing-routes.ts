/** Публичные маршруты ознакомительного сайта (marketing host). */
export const marketingRoutes = {
  home: "/marketing",
  product: "/marketing/product",
  modules: "/marketing/modules",
  security: "/marketing/security",
  pricing: "/marketing/pricing",
  contact: "/marketing/contact",
  privacy: "/marketing/legal/privacy",
  terms: "/marketing/legal/terms",
} as const;

export const marketingSitemapEntries: Array<{
  path: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}> = [
  { path: marketingRoutes.home, changeFrequency: "weekly", priority: 1 },
  { path: `${marketingRoutes.home}#why-business`, changeFrequency: "weekly", priority: 0.95 },
  { path: `${marketingRoutes.home}#modules-deep`, changeFrequency: "weekly", priority: 0.95 },
  { path: marketingRoutes.product, changeFrequency: "weekly", priority: 0.9 },
  { path: marketingRoutes.modules, changeFrequency: "weekly", priority: 0.9 },
  { path: marketingRoutes.security, changeFrequency: "monthly", priority: 0.8 },
  { path: marketingRoutes.pricing, changeFrequency: "weekly", priority: 0.85 },
  { path: marketingRoutes.contact, changeFrequency: "monthly", priority: 0.7 },
  { path: marketingRoutes.privacy, changeFrequency: "yearly", priority: 0.4 },
  { path: marketingRoutes.terms, changeFrequency: "yearly", priority: 0.4 },
];
