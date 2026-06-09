import type { MetadataRoute } from "next";

import { marketingSitemapEntries } from "@/lib/marketing-routes";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return marketingSitemapEntries.map((entry) => ({
    url: marketingAbsoluteUrl(entry.key),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
