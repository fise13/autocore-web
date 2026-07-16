import type { MetadataRoute } from "next";

import {
  marketingRobotsAllowPaths,
  marketingRobotsDisallowPaths,
} from "@/lib/seo/marketing-robots";
import { getMarketingUrl, getUrlHost } from "@/lib/site-urls";

/**
 * robots.txt for the marketing deployment.
 * Yandex uses the Host directive (via Next MetadataRoute.Robots `host`) to pick the main mirror.
 */
export default function robots(): MetadataRoute.Robots {
  const marketing = getMarketingUrl();
  const host = getUrlHost(marketing);
  const disallow = marketingRobotsDisallowPaths();

  return {
    rules: [
      {
        userAgent: "*",
        allow: marketingRobotsAllowPaths(),
        disallow,
      },
      {
        userAgent: "Yandex",
        allow: marketingRobotsAllowPaths(),
        disallow,
      },
      {
        userAgent: "Googlebot",
        allow: marketingRobotsAllowPaths(),
        disallow,
      },
    ],
    sitemap: `${marketing.replace(/\/$/, "")}/sitemap.xml`,
    ...(host ? { host } : {}),
  };
}
