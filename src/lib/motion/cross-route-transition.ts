import {
  getDissolveOverlay,
  mountDissolveOverlay,
  playDissolveEnter,
  playDissolveLeave,
  prefersReducedMotion,
  waitForTransitionTarget,
} from "@/lib/motion/dissolve-transition";

export const CROSS_ROUTE_STORAGE_KEY = "autocore-cross-route";
const CROSS_ROUTE_COOKIE = "autocore_cross_route";

export type CrossRouteDirection = "to-auth" | "to-marketing";

export function mountCrossRouteOverlay(root: HTMLElement | null): void {
  mountDissolveOverlay(root);
}

export function getCrossRouteOverlay() {
  return getDissolveOverlay();
}

export { prefersReducedMotion, waitForTransitionTarget };

function getSharedParentDomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return null;
  }
  const parts = host.split(".");
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join(".")}`;
  }
  return null;
}

export function markCrossRouteTransition(direction: CrossRouteDirection): void {
  sessionStorage.setItem(CROSS_ROUTE_STORAGE_KEY, direction);
  const domain = getSharedParentDomain();
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  if (domain) {
    document.cookie = `${CROSS_ROUTE_COOKIE}=${direction}; path=/; max-age=30; domain=${domain}; SameSite=Lax${secure}`;
  }
}

function readCrossRouteCookie(): CrossRouteDirection | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CROSS_ROUTE_COOKIE}=([^;]*)`));
  const value = match?.[1];
  if (value === "to-auth" || value === "to-marketing") return value;
  return null;
}

function clearCrossRouteCookie(): void {
  const domain = getSharedParentDomain();
  if (domain) {
    document.cookie = `${CROSS_ROUTE_COOKIE}=; path=/; max-age=0; domain=${domain}; SameSite=Lax`;
  }
  document.cookie = `${CROSS_ROUTE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function peekCrossRouteTransition(): CrossRouteDirection | null {
  const fromSession = sessionStorage.getItem(CROSS_ROUTE_STORAGE_KEY);
  if (fromSession === "to-auth" || fromSession === "to-marketing") {
    return fromSession;
  }
  return readCrossRouteCookie();
}

export function consumeCrossRouteTransition(): CrossRouteDirection | null {
  const value = peekCrossRouteTransition();
  sessionStorage.removeItem(CROSS_ROUTE_STORAGE_KEY);
  clearCrossRouteCookie();
  return value;
}

export function isMarketingPathname(pathname: string): boolean {
  if (pathname === "/" || pathname === "/marketing" || pathname.startsWith("/marketing/")) {
    return true;
  }
  return (
    pathname === "/product" ||
    pathname.startsWith("/product/") ||
    pathname === "/modules" ||
    pathname.startsWith("/modules/") ||
    pathname === "/pricing" ||
    pathname.startsWith("/pricing/") ||
    pathname === "/security" ||
    pathname.startsWith("/security/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname.startsWith("/legal/")
  );
}

function isAuthPathname(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/demo" ||
    pathname.startsWith("/demo/")
  );
}

export function resolveCrossRouteDirection(
  fromPathname: string,
  targetHref: string,
): CrossRouteDirection | null {
  if (typeof window === "undefined") return null;

  try {
    const target = new URL(targetHref, window.location.origin);
    const fromMarketing = isMarketingPathname(fromPathname);
    const fromAuth = isAuthPathname(fromPathname);
    const toAuth = isAuthPathname(target.pathname);
    const toMarketing = isMarketingPathname(target.pathname);

    if (fromMarketing && toAuth) return "to-auth";
    if (fromAuth && toMarketing) return "to-marketing";
    return null;
  } catch {
    return null;
  }
}

export function resolveExternalMarketingDirection(
  fromPathname: string,
  targetHref: string,
  marketingOrigin: string,
): CrossRouteDirection | null {
  if (typeof window === "undefined") return null;
  if (!isAuthPathname(fromPathname)) return null;

  try {
    const target = new URL(targetHref);
    const marketing = new URL(marketingOrigin);
    if (target.origin !== marketing.origin) return null;
    if (target.origin === window.location.origin) return null;
    if (!isMarketingPathname(target.pathname)) return null;
    return "to-marketing";
  } catch {
    return null;
  }
}

export function resolveExternalAppAuthDirection(
  fromPathname: string,
  targetHref: string,
  appOrigin: string,
): CrossRouteDirection | null {
  if (typeof window === "undefined") return null;
  if (!isMarketingPathname(fromPathname)) return null;

  try {
    const target = new URL(targetHref);
    const app = new URL(appOrigin);
    if (target.origin !== app.origin) return null;
    if (!isAuthPathname(target.pathname)) return null;
    if (target.origin === window.location.origin) return null;
    return "to-auth";
  } catch {
    return null;
  }
}

function getLeaveTarget(direction: CrossRouteDirection): HTMLElement | null {
  if (direction === "to-auth") {
    return document.querySelector<HTMLElement>('[data-barba="wrapper"]');
  }
  return document.querySelector<HTMLElement>("[data-login-screen]");
}

function getEnterSelector(direction: CrossRouteDirection): string {
  return direction === "to-auth" ? "[data-login-screen]" : '[data-barba="wrapper"]';
}

export async function playCrossRouteLeave(
  direction: CrossRouteDirection,
  leaveTarget?: HTMLElement | null,
): Promise<void> {
  const target = leaveTarget ?? getLeaveTarget(direction);
  await playDissolveLeave(target);
}

let enterInFlight = false;

export async function playCrossRouteEnter(
  direction: CrossRouteDirection,
  enterTarget?: HTMLElement | null,
): Promise<void> {
  if (enterInFlight) return;
  enterInFlight = true;

  try {
    if (prefersReducedMotion()) {
      consumeCrossRouteTransition();
      return;
    }

    if (!peekCrossRouteTransition()) return;

    const target = enterTarget ?? (await waitForTransitionTarget(getEnterSelector(direction)));
    await playDissolveEnter(target);
    consumeCrossRouteTransition();
  } finally {
    enterInFlight = false;
  }
}
