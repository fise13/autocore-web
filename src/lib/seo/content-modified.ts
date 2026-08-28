import { execFileSync } from "node:child_process";

import type { MarketingPathKey } from "@/lib/seo/marketing-paths";

/**
 * When each marketing page's content last actually changed.
 *
 * The sitemap used to stamp every URL with `new Date()` at build time, so all
 * eleven entries — the homepage and the terms of use alike — claimed to have
 * been modified at the same instant, and that instant moved on every deploy.
 * A `lastmod` that is always "now" is worse than none: Google's guidance is to
 * include it only when it is accurate, and a file that cries wolf on every
 * deploy gets its lastmod ignored wholesale.
 *
 * So the date comes from git — the last commit that touched the route or the
 * messages it renders. When git cannot answer (a shallow clone, a tarball
 * build, no history at all) the answer is `null` and the field is omitted
 * entirely, which is the honest outcome rather than a fabricated one.
 */

/** Files whose changes genuinely change what a page renders. */
const SOURCES: Record<MarketingPathKey, string[]> = {
  home: ["src/app/marketing/[locale]/page.tsx", "src/components/marketing/experience"],
  product: ["src/app/marketing/[locale]/product/page.tsx", "src/components/marketing/product"],
  modules: [
    "src/app/marketing/[locale]/modules/page.tsx",
    "src/components/marketing/site/modules-page-content.tsx",
  ],
  pricing: ["src/app/marketing/[locale]/pricing/page.tsx", "src/components/marketing/pricing"],
  security: ["src/app/marketing/[locale]/security/page.tsx", "src/components/marketing/security"],
  contact: ["src/app/marketing/[locale]/contact/page.tsx", "src/components/marketing/contact"],
  download: ["src/app/marketing/[locale]/download/page.tsx", "src/components/marketing/download"],
  downloadMobile: [
    "src/app/marketing/[locale]/download/mobile/page.tsx",
    "src/components/marketing/download",
  ],
  privacy: ["src/app/marketing/[locale]/legal/privacy/page.tsx"],
  refund: ["src/app/marketing/[locale]/legal/refund/page.tsx"],
  terms: ["src/app/marketing/[locale]/legal/terms/page.tsx"],
};

/** Copy lives here for every page, so it counts as a source for all of them. */
const SHARED_SOURCES = ["packages/i18n/src/messages/en/marketing.json"];

let cache: Partial<Record<MarketingPathKey, Date | null>> = {};

function gitLastModified(paths: string[]): Date | null {
  try {
    const stdout = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", ...paths],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 },
    ).trim();

    if (!stdout) return null;
    const date = new Date(stdout);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    // No git, no history, or a shallow clone that cannot see the commit.
    return null;
  }
}

/** Last modification date for a marketing page, or null when unknowable. */
export function contentLastModified(key: MarketingPathKey): Date | null {
  if (key in cache) return cache[key] ?? null;

  const resolved = gitLastModified([...SOURCES[key], ...SHARED_SOURCES]);
  cache = { ...cache, [key]: resolved };
  return resolved;
}
