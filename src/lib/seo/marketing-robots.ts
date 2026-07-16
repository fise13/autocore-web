/** Indexable paths for robots.txt: always clean public URLs. */
export function marketingRobotsAllowPaths(): string[] {
  return [
    "/",
    "/product",
    "/modules",
    "/pricing",
    "/security",
    "/contact",
    "/download",
    "/download/mobile",
    "/legal/",
    "/opengraph-image",
    "/manifest.webmanifest",
    "/icon",
    "/apple-icon",
    "/sitemap.xml",
  ];
}

/** App / private surfaces that must never be indexed on either host. */
export function marketingRobotsDisallowPaths(): string[] {
  return [
    "/api/",
    "/login",
    "/demo",
    "/invite",
    "/join",
    "/import",
    "/migration",
    "/warranty",
    "/deck",
    "/auth/",
    "/warehouse",
    "/motors",
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
    "/marketing/",
  ];
}
