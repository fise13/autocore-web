import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ALLOWED_PATH_PREFIXES,
  ROUTE_CATALOG,
  allowedRouteList,
  describeRouteCatalog,
  isAllowedHref,
  isInternalHref,
} from "@/domain/ai/internal-href";

test("rejects anything that leaves the origin", () => {
  for (const href of [
    "//evil.com",
    "https://evil.com/motors",
    "http://evil.com",
    "javascript:alert(1)",
    "data:text/html,<script>",
    "/\\evil.com",
    "motors",
    "",
    "   ",
  ]) {
    assert.equal(isInternalHref(href), false, `${JSON.stringify(href)} must be rejected`);
    assert.equal(isAllowedHref(href), false, `${JSON.stringify(href)} must be rejected`);
  }
});

test("rejects control characters that smuggle a scheme past a prefix check", () => {
  for (const href of ["/motors\u0000", "/motors\u001f", "/motors\u007f"]) {
    assert.equal(isInternalHref(href), false, `${JSON.stringify(href)} must be rejected`);
  }
});

test("accepts real routes with queries and sub-paths", () => {
  for (const href of [
    "/",
    "/motors",
    "/motors?collection=engines",
    "/motors?collection=engines&motor=abc",
    "/work-orders",
    "/work-orders/123",
    "/warehouse?location=loc-1",
    "/accounting",
  ]) {
    assert.equal(isAllowedHref(href), true, `${href} must be allowed`);
  }
});

test("rejects the paths the model actually hallucinated", () => {
  // These are the guesses that exhausted Core's step budget before the route
  // catalog was added to the prompt.
  for (const href of [
    "/invoices",
    "/invoices?status=unpaid",
    "/finance",
    "/accounts-receivable",
    "/billing",
  ]) {
    assert.equal(isAllowedHref(href), false, `${href} must be rejected`);
  }
});

test("a prefix match cannot be faked by a longer segment", () => {
  assert.equal(isAllowedHref("/motorsport"), false);
  assert.equal(isAllowedHref("/team-secret"), false);
  assert.equal(isAllowedHref("/settings-export"), false);
});

test("the catalog and the validator cannot drift apart", () => {
  // The prompt is generated from ROUTE_CATALOG, so every entry must pass the
  // validator — otherwise Core is told to use a path it will be denied.
  for (const route of ROUTE_CATALOG) {
    assert.equal(isAllowedHref(route.path), true, `${route.path} is advertised but rejected`);
  }
  for (const prefix of ALLOWED_PATH_PREFIXES) {
    assert.ok(
      ROUTE_CATALOG.some((route) => route.path === prefix),
      `${prefix} is allowed but not described to the model`,
    );
  }
});

test("the rejection message names every valid route", () => {
  const list = allowedRouteList();
  for (const route of ROUTE_CATALOG) {
    assert.ok(list.includes(route.path), `${route.path} missing from the rejection hint`);
  }
});

test("the prompt catalog explains what each route is for", () => {
  const text = describeRouteCatalog();
  for (const route of ROUTE_CATALOG) {
    assert.ok(text.includes(route.purpose), `${route.path} has no purpose in the prompt`);
  }
});
