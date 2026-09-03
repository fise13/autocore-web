/** iOS / macOS Universal Links + Android App Links. */

export const MOBILE_IOS_TEAM_ID = "45W7LA3QFP";
export const MOBILE_IOS_BUNDLE_ID = "com.wise.autocore.mobile";
export const DESKTOP_MAC_BUNDLE_ID = "com.wise.autocore.desktop";
export const MOBILE_ANDROID_PACKAGE = "com.wise.autocore.mobile";

export const MOBILE_UNIVERSAL_LINKS_HOST = "app.myautocore.com";
export const MOBILE_UNIVERSAL_LINKS_MARKETING_HOST = "myautocore.com";

export const MOBILE_IOS_APP_ID = `${MOBILE_IOS_TEAM_ID}.${MOBILE_IOS_BUNDLE_ID}`;
export const DESKTOP_MAC_APP_ID = `${MOBILE_IOS_TEAM_ID}.${DESKTOP_MAC_BUNDLE_ID}`;

/** Team ID + bundle IDs claimed in `apple-app-site-association`. iOS first. */
export const UNIVERSAL_LINK_APP_IDS = [MOBILE_IOS_APP_ID, DESKTOP_MAC_APP_ID] as const;

export type UniversalLinkHostKind = "app" | "marketing";

/**
 * Canonical paths the mobile app can actually render.
 *
 * Mirror of the route table in
 * `autocore-mobile/lib/deep-links/canonical-deep-links.ts` — a path is claimed
 * here only when that resolver has a screen for it. Claiming a path the app
 * cannot render would swallow the link into a fallback instead of letting the
 * browser show the real page.
 */
export const MOBILE_UNIVERSAL_LINK_PATHS = [
  "/invite/*",
  "/join",
  "/join?*",
  "/work-orders",
  "/work-orders/*",
  "/warehouse",
  "/motors",
  "/engine-intake",
  "/accounting",
  "/my-earnings",
  "/team",
  "/settings",
  "/ai",
  "/import",
  "/import?*",
  "/imports",
  "/imports/batch/*",
] as const;

/**
 * Never handed to the app, in match order ahead of everything else.
 *
 * These are browser-owned: sign-in and OAuth handlers (hijacking them would
 * break web auth outright), PDF/render routes, the AASA files themselves, and
 * every marketing page. `?mode=browser` is Apple's documented escape hatch for
 * forcing any link to open in Safari — support it everywhere.
 */
const EXCLUDED_PATHS = [
  "/login",
  "/login/*",
  "/auth/*",
  "/demo",
  "/deck/*",
  "/api/*",
  "/render/*",
  "/documents/*",
  "/migration",
  "/warranty/*",
  "/.well-known/*",
  "/product",
  "/product/*",
  "/modules",
  "/modules/*",
  "/pricing",
  "/security",
  "/contact",
  "/legal/*",
  "/marketing/*",
] as const;

type AasaComponent = Record<string, unknown>;

function excludeComponents(): AasaComponent[] {
  return [
    // Apple's convention: any URL may be forced into the browser.
    { "/": "*", "?": { mode: "browser" }, exclude: true, comment: "browser override" },
    ...EXCLUDED_PATHS.map((path) => ({
      "/": path,
      exclude: true,
      comment: "browser-owned route",
    })),
  ];
}

function includeComponents(hostKind: UniversalLinkHostKind): AasaComponent[] {
  const components: AasaComponent[] = [];

  // The app host's root is the workspace overview, so it belongs to the app.
  // The marketing root is the public landing page and must stay in Safari —
  // claiming it would open the app instead of the site people came to read.
  if (hostKind === "app") {
    components.push({ "/": "/" });
  }

  components.push({ "/": "/invite/*" });
  components.push({ "/": "/join" });
  components.push({ "/": "/work-orders" });
  components.push({ "/": "/work-orders/*" });
  components.push({ "/": "/warehouse" });
  components.push({ "/": "/motors" });
  components.push({ "/": "/engine-intake" });
  components.push({ "/": "/accounting" });
  components.push({ "/": "/my-earnings" });
  components.push({ "/": "/team" });
  components.push({ "/": "/settings" });
  components.push({ "/": "/ai" });
  components.push({ "/": "/import" });
  components.push({ "/": "/imports" });
  components.push({ "/": "/imports/batch/*" });

  return components;
}

/**
 * Path list for the legacy `appID` + `paths` detail block, which iOS 12 and
 * older read instead of `components`. Root is expressed as `/` only on the app
 * host, matching `includeComponents`.
 */
export function legacyPathsForHost(hostKind: UniversalLinkHostKind): string[] {
  const paths = [...MOBILE_UNIVERSAL_LINK_PATHS] as string[];
  return hostKind === "app" ? ["/", ...paths] : paths;
}

export function universalLinkHostKind(host: string | null | undefined): UniversalLinkHostKind {
  const normalized = (host ?? "").split(":")[0]?.toLowerCase().replace(/^www\./, "") ?? "";
  return normalized === MOBILE_UNIVERSAL_LINKS_MARKETING_HOST ? "marketing" : "app";
}

/**
 * `apple-app-site-association` body for one host.
 *
 * Exclusions come first because iOS/macOS stop at the first matching component.
 * Both the iPhone app and the Mac desktop shell claim the same paths so a
 * shared `https://app.myautocore.com/...` link (and Handoff `webpageURL`)
 * opens the native client on whichever device received it.
 */
export function buildAppleAppSiteAssociation(
  hostKind: UniversalLinkHostKind = "app",
): Record<string, unknown> {
  const components = [...excludeComponents(), ...includeComponents(hostKind)];
  const legacyPaths = legacyPathsForHost(hostKind);

  return {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [...UNIVERSAL_LINK_APP_IDS],
          components,
        },
        // iOS 12 and earlier ignore `components` and read this block instead.
        {
          appID: MOBILE_IOS_APP_ID,
          paths: legacyPaths,
        },
        {
          appID: DESKTOP_MAC_APP_ID,
          paths: legacyPaths,
        },
      ],
    },
    // Required for NSUserActivity webpageURL Handoff. `applinks` alone opens
    // taps from Notes/Mail; Continuity will not hand a browsing-web activity
    // to an app that is missing from this list.
    activitycontinuation: {
      apps: [...UNIVERSAL_LINK_APP_IDS],
    },
  };
}

export function buildAndroidAssetLinks(sha256Fingerprints: string[]): Record<string, unknown>[] {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: MOBILE_ANDROID_PACKAGE,
        sha256_cert_fingerprints: sha256Fingerprints,
      },
    },
  ];
}
