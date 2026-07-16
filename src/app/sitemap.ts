import type { MetadataRoute } from "next";

import { marketingSitemapEntries } from "@/lib/marketing-routes";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import { getMarketingUrl } from "@/lib/site-urls";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const marketingUrl = getMarketingUrl().replace(/\/$/, "");
  const ogImage = `${marketingUrl}/opengraph-image`;

  return marketingSitemapEntries.map((entry) => ({
    url: marketingAbsoluteUrl(entry.key),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    alternates: {
      languages: {
        "ru-RU": marketingAbsoluteUrl(entry.key),
      },
    },
    images: entry.key === "home" || entry.priority >= 0.85 ? [ogImage] : undefined,
  }));
}
