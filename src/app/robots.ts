import type { MetadataRoute } from "next";

import { getMarketingUrl } from "@/lib/site-urls";

export default function robots(): MetadataRoute.Robots {
  const marketing = getMarketingUrl();
  return {
    rules: [
      {
        userAgent: "*",
    allow: ["/", "/marketing", "/marketing/"],
    disallow: ["/warehouse", "/motors", "/accounting", "/employees", "/login", "/settings", "/roles", "/sold", "/specific"],
      },
    ],
    sitemap: `${marketing}/sitemap.xml`,
    host: marketing.replace(/^https?:\/\//, ""),
  };
}
