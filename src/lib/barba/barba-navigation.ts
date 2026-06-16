import { resolveMarketingPathFromClean } from "@/lib/seo/marketing-paths";

/** Routes inside the authenticated dashboard that use Barba transitions. */
const DASHBOARD_ANIMATED_PREFIXES = [
  "/motors",
  "/sold",
  "/warehouse",
  "/accounting",
  "/employees",
  "/roles",
  "/settings",
  "/work-orders",
  "/specific",
  "/quotes",
  "/documents",
  "/team",
  "/activity",
] as const;

export function isMarketingInternalPath(pathname: string): boolean {
  return pathname === "/marketing" || pathname.startsWith("/marketing/");
}

export function isMarketingPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return resolveMarketingPathFromClean(pathname) !== null;
}

export function isMarketingNavPath(pathname: string): boolean {
  return isMarketingPublicPath(pathname) || isMarketingInternalPath(pathname);
}

export function isDashboardAnimatedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return DASHBOARD_ANIMATED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function marketingSegment(pathname: string): string {
  if (pathname === "/" || pathname === "/marketing" || pathname === "/marketing/") {
    return "home";
  }
  if (isMarketingInternalPath(pathname)) {
    return pathname.replace(/^\/marketing\/?/, "").replace(/\//g, "-") || "home";
  }
  return pathname.replace(/^\//, "").replace(/\//g, "-") || "home";
}

export function pathToBarbaNamespace(
  pathname: string,
  context: "marketing" | "app" = "app",
): string {
  if (context === "marketing" && isMarketingNavPath(pathname)) {
    return `marketing-${marketingSegment(pathname)}`;
  }
  if (pathname === "/") return "app-mission-control";
  return `app-${pathname.slice(1).replace(/\//g, "-")}`;
}

export function shouldAnimateMarketingNavigation(target: URL, currentPathname: string): boolean {
  if (target.origin !== window.location.origin) return false;
  if (!isMarketingNavPath(target.pathname)) return false;
  if (target.pathname === currentPathname && target.hash && !target.search) return false;
  const current = currentPathname + window.location.search;
  const next = target.pathname + target.search;
  return current !== next;
}

export function shouldAnimateDashboardNavigation(target: URL, currentPathname: string): boolean {
  if (target.origin !== window.location.origin) return false;
  if (!isDashboardAnimatedPath(target.pathname)) return false;
  if (!isDashboardAnimatedPath(currentPathname)) return false;
  if (target.pathname === currentPathname && target.hash && !target.search) return false;
  const current = currentPathname + window.location.search;
  const next = target.pathname + target.search;
  return current !== next;
}
