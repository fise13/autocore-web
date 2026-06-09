import type { MetadataRoute } from "next";

import { marketingRobotsAllowPaths } from "@/lib/seo/marketing-robots";
import { getMarketingUrl } from "@/lib/site-urls";

export default function robots(): MetadataRoute.Robots {
  const marketing = getMarketingUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: marketingRobotsAllowPaths(),
        disallow: [
          "/warehouse",
          "/motors",
          "/accounting",
          "/employees",
          "/login",
          "/settings",
          "/roles",
          "/sold",
          "/specific",
          "/demo",
          "/api/",
        ],
      },
    ],
    sitemap: `${marketing.replace(/\/$/, "")}/sitemap.xml`,
    host: marketing.replace(/^https?:\/\//, ""),
  };
}
