import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Same module the app ships. Imported directly so the two halves of the
// contract cannot drift: anything claimed in the AASA must resolve to a screen.
import {
  matchCanonicalPath,
  parseCanonicalUrl,
} from "../../../autocore-mobile/lib/deep-links/canonical-deep-links";
import {
  DESKTOP_MAC_APP_ID,
  DESKTOP_MAC_BUNDLE_ID,
  MOBILE_IOS_APP_ID,
  MOBILE_IOS_BUNDLE_ID,
  MOBILE_IOS_TEAM_ID,
  UNIVERSAL_LINK_APP_IDS,
  buildAppleAppSiteAssociation,
  universalLinkHostKind,
} from "./universal-links";

type Component = { "/"?: string; exclude?: boolean; "?"?: Record<string, string> };

function detailsOf(hostKind: "app" | "marketing") {
  const aasa = buildAppleAppSiteAssociation(hostKind) as {
    applinks: { details: Array<{ appIDs?: string[]; appID?: string; components?: Component[]; paths?: string[] }> };
  };
  return aasa.applinks.details;
}

function componentsOf(hostKind: "app" | "marketing"): Component[] {
  return detailsOf(hostKind)[0].components ?? [];
}

/** Mirrors how iOS matches: first component whose pattern matches wins. */
function claimsPath(hostKind: "app" | "marketing", path: string): boolean {
  for (const component of componentsOf(hostKind)) {
    const pattern = component["/"];
    if (pattern === undefined) continue;
    // Query-constrained components (the ?mode=browser override) never match a
    // bare path, so they are skipped here.
    if (component["?"]) continue;
    if (!matchesPattern(pattern, path)) continue;
    return component.exclude !== true;
  }
  return false;
}

function matchesPattern(pattern: string, path: string): boolean {
  if (pattern === "*") return true;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  // `*` matches within a path component, `?` matches a single character.
  const regex = new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
  return regex.test(path);
}

describe("Handoff activitycontinuation", () => {
  it("lists both native clients so Continuity can hand a webpageURL across devices", () => {
    const aasa = buildAppleAppSiteAssociation("app") as {
      activitycontinuation?: { apps?: string[] };
    };
    assert.deepEqual(aasa.activitycontinuation?.apps, [...UNIVERSAL_LINK_APP_IDS]);
  });
});

describe("app identifiers", () => {
  it("uses the Team ID and Bundle IDs the iOS and Mac builds are signed with", () => {
    assert.equal(MOBILE_IOS_TEAM_ID, "45W7LA3QFP");
    assert.equal(MOBILE_IOS_BUNDLE_ID, "com.wise.autocore.mobile");
    assert.equal(DESKTOP_MAC_BUNDLE_ID, "com.wise.autocore.desktop");
    assert.equal(MOBILE_IOS_APP_ID, "45W7LA3QFP.com.wise.autocore.mobile");
    assert.equal(DESKTOP_MAC_APP_ID, "45W7LA3QFP.com.wise.autocore.desktop");
  });

  it("lists iOS then Mac in the modern block, and both in legacy blocks", () => {
    const [modern, legacyIos, legacyMac] = detailsOf("app");
    assert.deepEqual(modern.appIDs, [...UNIVERSAL_LINK_APP_IDS]);
    assert.equal(legacyIos.appID, MOBILE_IOS_APP_ID);
    assert.equal(legacyMac.appID, DESKTOP_MAC_APP_ID);
  });
});

describe("host resolution", () => {
  it("treats only the bare marketing origin as marketing", () => {
    assert.equal(universalLinkHostKind("myautocore.com"), "marketing");
    assert.equal(universalLinkHostKind("www.myautocore.com"), "marketing");
    assert.equal(universalLinkHostKind("myautocore.com:443"), "marketing");
    assert.equal(universalLinkHostKind("app.myautocore.com"), "app");
    assert.equal(universalLinkHostKind(null), "app");
  });
});

describe("claimed paths", () => {
  it("claims the workspace routes on both origins", () => {
    for (const path of [
      "/work-orders",
      "/work-orders/wo_123",
      "/warehouse",
      "/motors",
      "/engine-intake",
      "/accounting",
      "/my-earnings",
      "/team",
      "/settings",
      "/import",
      "/imports",
      "/imports/batch/b1",
      "/invite/tok",
      "/join",
    ]) {
      assert.equal(claimsPath("app", path), true, `app ${path}`);
      assert.equal(claimsPath("marketing", path), true, `marketing ${path}`);
    }
  });

  it("claims the root only on the app origin", () => {
    assert.equal(claimsPath("app", "/"), true);
    // Claiming `/` on myautocore.com would open the app instead of the
    // marketing site people followed the link to read.
    assert.equal(claimsPath("marketing", "/"), false);
  });

  it("never claims browser-owned routes", () => {
    for (const path of [
      "/login",
      "/auth/action",
      "/demo",
      "/deck/callback",
      "/api/pdf/invoice/1",
      "/render/documents/1/invoice",
      "/documents/1/invoice",
      "/warranty/tok",
      "/.well-known/apple-app-site-association",
      "/migration",
    ]) {
      assert.equal(claimsPath("app", path), false, path);
    }
  });

  it("never claims marketing pages", () => {
    for (const path of ["/pricing", "/product", "/modules", "/security", "/contact", "/legal/terms"]) {
      assert.equal(claimsPath("marketing", path), false, path);
      assert.equal(claimsPath("app", path), false, path);
    }
  });

  it("does not claim routes the app has no screen for", () => {
    for (const path of ["/documents", "/quotes", "/sold", "/roles", "/activity", "/status"]) {
      assert.equal(claimsPath("app", path), false, path);
    }
  });

  it("exposes Apple's ?mode=browser escape hatch", () => {
    const components = componentsOf("app");
    const overrideIndex = components.findIndex((component) => component["?"]?.mode === "browser");
    assert.ok(overrideIndex >= 0, "expected a mode=browser exclusion");
    assert.equal(components[overrideIndex].exclude, true);
    assert.equal(overrideIndex, 0, "the override must be matched first");
  });
});

describe("AASA and the mobile resolver agree", () => {
  it("resolves every claimed path to a mobile screen", () => {
    const claimed = [
      "/",
      "/work-orders",
      "/work-orders/wo_123",
      "/warehouse",
      "/motors",
      "/engine-intake",
      "/accounting",
      "/my-earnings",
      "/team",
      "/settings",
      "/ai",
      "/import",
      "/imports",
      "/imports/batch/b1",
      "/invite/tok",
      "/join",
    ];

    for (const path of claimed) {
      assert.equal(claimsPath("app", path), true, `AASA should claim ${path}`);
      const parsed = parseCanonicalUrl(path);
      assert.ok(parsed, `${path} should parse`);
      assert.ok(
        matchCanonicalPath(parsed.path, parsed.query),
        `mobile resolver has no screen for ${path}`,
      );
    }
  });

  it("does not claim anything the mobile resolver drops", () => {
    for (const path of ["/documents", "/quotes", "/sold", "/roles", "/status", "/changelog"]) {
      assert.equal(matchCanonicalPath(path), null, `resolver unexpectedly maps ${path}`);
      assert.equal(claimsPath("app", path), false, `AASA unexpectedly claims ${path}`);
    }
  });
});
