import { z } from "zod";

/**
 * Same-origin link validation for anything Core renders as a link.
 *
 * Two callers, one rule:
 * - `internalHref` — zod refine used by every tool output schema.
 * - `isAllowedHref` — route allowlist applied on top, so a validated-but-unknown
 *   path never becomes a dead link.
 *
 * Tool executors build hrefs from real record ids server-side, so the model
 * never authors a URL. `navigateTo` is the one place a model-supplied path is
 * accepted, and it passes through both checks.
 */

/**
 * Routes the app actually serves, with what each one is for.
 *
 * This doubles as the catalog handed to the model. Without it Core guesses
 * plausible-but-absent paths (`/invoices`, `/billing`, `/accounts-receivable`),
 * burns a step on each rejection, and can exhaust its step budget before
 * answering. The list is the same data the validator uses, so the prompt can
 * never drift from what is actually allowed.
 */
export const ROUTE_CATALOG = [
  { path: "/home", purpose: "Dashboard overview" },
  { path: "/motors", purpose: "Serialized engines, transmissions and parts inventory" },
  { path: "/sold", purpose: "Sold units and sales history" },
  { path: "/engine-intake", purpose: "Intake pipeline for newly received engines" },
  { path: "/work-orders", purpose: "Repair work orders" },
  { path: "/accounting", purpose: "Financial operations — income, expense, cash flow, profit" },
  { path: "/my-earnings", purpose: "The signed-in user's own payouts" },
  { path: "/warehouse", purpose: "Stock items, locations and movements" },
  { path: "/documents", purpose: "Generated documents and invoices" },
  { path: "/specific", purpose: "Custom category sheets" },
  { path: "/imports", purpose: "Spreadsheet and photo imports" },
  { path: "/quotes", purpose: "Customer quotes" },
  { path: "/team", purpose: "Employees and invitations" },
  { path: "/employees", purpose: "Employee records" },
  { path: "/roles", purpose: "Roles and permissions" },
  { path: "/settings", purpose: "Company and app settings" },
  { path: "/activity", purpose: "Activity log" },
  { path: "/help", purpose: "Help and support" },
  { path: "/ai", purpose: "Core itself" },
] as const;

export const ALLOWED_PATH_PREFIXES = ROUTE_CATALOG.map((route) => route.path);

/** Human-readable catalog for the system prompt and for rejection messages. */
export function describeRouteCatalog(): string {
  return ROUTE_CATALOG.map((route) => `${route.path} — ${route.purpose}`).join("\n");
}

/** Compact route list, used when telling the model a path was rejected. */
export function allowedRouteList(): string {
  return ROUTE_CATALOG.map((route) => route.path).join(", ");
}

/**
 * Reject anything that is not a plain same-origin path.
 *
 * `//host` is protocol-relative and would leave the origin; a backslash is
 * normalised to `/` by some browsers, so `/\evil.com` is treated the same way.
 * Control characters are stripped by URL parsers and can smuggle a scheme past
 * a naive prefix check.
 */
export function isInternalHref(value: string): boolean {
  const href = value.trim();
  if (!href.startsWith("/")) return false;
  if (href.startsWith("//")) return false;
  if (href.startsWith("/\\")) return false;
  if (/[\u0000-\u001f\u007f]/.test(href)) return false;
  return true;
}

export function isAllowedHref(value: string): boolean {
  if (!isInternalHref(value)) return false;
  const href = value.trim();
  if (href === "/" || href === "/home") return true;
  return ALLOWED_PATH_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}?`) || href.startsWith(`${prefix}/`),
  );
}

export const internalHref = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine(isInternalHref, { message: "href must be an internal AutoCore path" });

/** Href that must also resolve to a route the app serves. */
export const allowedHref = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine(isAllowedHref, { message: "href must be a known AutoCore route" });
