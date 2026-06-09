import { usesCleanMarketingPaths } from "@/lib/seo/marketing-paths";

/** Indexable paths for robots.txt on the current deployment. */
export function marketingRobotsAllowPaths(): string[] {
  if (usesCleanMarketingPaths()) {
    return ["/", "/product", "/modules", "/pricing", "/security", "/contact", "/legal/"];
  }
  return ["/", "/marketing", "/marketing/"];
}
