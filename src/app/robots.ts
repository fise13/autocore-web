import type { MetadataRoute } from "next";

import {
  marketingRobotsAllowPaths,
  marketingRobotsDisallowPaths,
} from "@/lib/seo/marketing-robots";
import { getMarketingUrl } from "@/lib/site-urls";

/**
 * robots.txt for the marketing host.
 *
 * One group, not three. This used to emit byte-identical rule sets for `*`,
 * `Yandex`, and `Googlebot`. That is not merely redundant: a crawler that finds
 * a group matching its own name reads only that group and ignores `*`, so the
 * next person to edit "the rules" would have silently changed them for
 * everything except Google and Yandex. A single `*` group cannot drift.
 *
 * The `Host` directive is also gone — Yandex retired it in 2018, and the
 * canonical host is already asserted by the www→apex redirects in
 * `next.config.ts` and by the canonical tag on every page.
 */
export default function robots(): MetadataRoute.Robots {
  const marketing = getMarketingUrl().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: marketingRobotsAllowPaths(),
        disallow: marketingRobotsDisallowPaths(),
      },
    ],
    sitemap: `${marketing}/sitemap.xml`,
  };
}
