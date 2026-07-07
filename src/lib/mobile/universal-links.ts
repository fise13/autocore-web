/** iOS Universal Links + Android App Links for AutoCore Mobile. */

export const MOBILE_IOS_TEAM_ID = "45W7LA3QFP";
export const MOBILE_IOS_BUNDLE_ID = "com.wise.autocore.mobile";
export const MOBILE_ANDROID_PACKAGE = "com.wise.autocore.mobile";
export const MOBILE_UNIVERSAL_LINKS_HOST = "app.myautocore.com";

export const MOBILE_IOS_APP_ID = `${MOBILE_IOS_TEAM_ID}.${MOBILE_IOS_BUNDLE_ID}`;

/** Paths opened in the native app instead of Safari. */
export const MOBILE_UNIVERSAL_LINK_PATHS = ["/invite/*", "/join", "/join?*"] as const;

export function buildAppleAppSiteAssociation(): Record<string, unknown> {
  return {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [MOBILE_IOS_APP_ID],
          components: [
            { "/": "/invite/*" },
            { "/": "/join", "?": { token: "?*" } },
            { "/": "/join", "?": { invite: "?*" } },
          ],
        },
        // Legacy iOS fallback
        {
          appID: MOBILE_IOS_APP_ID,
          paths: [...MOBILE_UNIVERSAL_LINK_PATHS],
        },
      ],
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
