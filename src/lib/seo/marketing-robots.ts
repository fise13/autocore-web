/**
 * robots.txt rules for both public hosts, from one source.
 *
 * These lists used to be inverted. The marketing host disallowed 25 app paths
 * that do not exist on it, while the app host — where those paths actually live
 * — shipped its own hand-written robots.txt inside `src/middleware.ts` that
 * disallowed only `/home`, `/warehouse`, `/work-orders`, `/settings`, and
 * `/api/`. Everything else on the app host was crawlable, including the
 * token-bearing `/invite/{token}` and `/warranty/{token}`. Keeping both hosts
 * honest means keeping both rule sets in the same file.
 *
 * robots.txt is a crawl directive, never an indexing one: a disallowed URL can
 * still be indexed from an external link without ever being fetched. Anything
 * that must stay out of the index also carries `noindex` — see
 * `src/lib/seo/private-route-metadata.ts`. These rules are the first layer, not
 * the guarantee.
 *
 * Entries are plain prefixes, which is what robots.txt matching wants: `/sold`
 * covers `/sold`, `/sold/123`, and `/sold?tab=x` alike. It would also cover a
 * hypothetical `/sold-parts`, so a new public path must not start with any
 * prefix listed here.
 */

/** Indexable paths on the marketing host: always clean public URLs. */
export function marketingRobotsAllowPaths(): string[] {
  return [
    "/",
    "/product",
    "/modules",
    "/pricing",
    "/security",
    "/contact",
    "/download",
    "/legal/",
  ];
}

/** Product surfaces that must not be crawled on either host. */
export function privateAppRobotsPaths(): string[] {
  return [
    "/api/",
    "/auth/",
    "/home",
    "/demo",
    "/invite",
    "/join",
    "/import",
    "/migration",
    "/warranty",
    "/deck",
    "/render",
    "/media",
    "/ai",
    "/warehouse",
    "/motors",
    "/engine-intake",
    "/sold",
    "/specific",
    "/work-orders",
    "/documents",
    "/quotes",
    "/accounting",
    "/employees",
    "/team",
    "/roles",
    "/settings",
    "/activity",
    "/my-earnings",
    "/help",
    "/changelog",
    "/status",
  ];
}

/**
 * Shared tail for both hosts.
 *
 * `/marketing/` is the internal App Router tree that clean URLs rewrite onto;
 * it must never be crawled under its raw path. `/business.html` is served from
 * `/public`, so it answers on both hosts — it is `noindex` in the file itself
 * and disallowed here so neither copy is crawled.
 */
const SHARED_DISALLOW = ["/marketing/", "/business.html", "/download/mobile"];

/** Marketing-host disallows. */
export function marketingRobotsDisallowPaths(): string[] {
  return [...privateAppRobotsPaths(), ...SHARED_DISALLOW];
}

/** App-host disallows — the same private surfaces, where they actually live. */
export function appHostRobotsDisallowPaths(): string[] {
  return [...privateAppRobotsPaths(), ...SHARED_DISALLOW];
}

/**
 * The app host's robots.txt body, served by middleware.
 *
 * `/login` and `/welcome` stay crawlable: both carry `index: true` in their own
 * metadata, and the app root is a public merchant page that canonicalises to
 * the marketing homepage.
 */
export function buildAppHostRobotsTxt(sitemapUrl: string): string {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Allow: /login",
    "Allow: /welcome",
    ...appHostRobotsDisallowPaths().map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${sitemapUrl}`,
    "",
  ];
  return lines.join("\n");
}
