import type { Metadata } from "next";

/**
 * `noindex` for surfaces that are publicly reachable but must never be indexed.
 *
 * These routes live on the app host, and the app host's robots.txt (built in
 * `src/middleware.ts`) only ever disallowed a handful of dashboard paths — so
 * `/join`, `/invite/{token}`, `/warranty/{token}`, and `/deck/callback` were all
 * crawlable. Two of them carry a secret in the URL itself. robots.txt is not the
 * right control for that anyway: it asks a crawler not to fetch, but a URL that
 * leaks through a referrer or a shared link can still be indexed without ever
 * being fetched. A `noindex` on the page is what actually keeps it out.
 *
 * `follow` stays on so the links these pages carry are still worth something,
 * and `nocache`/`noarchive` keep copies out of caches and previews.
 */
export const privateRouteRobots = {
  index: false,
  follow: true,
  nocache: true,
  googleBot: {
    index: false,
    follow: true,
    noimageindex: true,
  },
} as const satisfies Metadata["robots"];

/** Metadata for a publicly reachable, never-indexed route. */
export function privateRouteMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: privateRouteRobots,
  };
}
