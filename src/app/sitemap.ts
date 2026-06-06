import type { MetadataRoute } from "next";

import { marketingSitemapEntries } from "@/lib/marketing-routes";
import { getMarketingUrl } from "@/lib/site-urls";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getMarketingUrl().replace(/\/$/, "");
  const lastModified = new Date();

  return marketingSitemapEntries.map((entry) => ({
    url: `${base}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
