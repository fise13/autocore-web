/**
 * Dense inventory chrome already has a primary action (Magic Import / selector / search).
 * Mobile Import island should yield there — except true empty workspaces.
 */
export function isDenseInventoryChromeRoute(pathname: string): boolean {
  return pathname === "/warehouse" || pathname === "/motors" || pathname === "/sold";
}

/** Hide the inbox island on import review itself — user is already there. */
export function isDocumentImportReviewRoute(pathname: string): boolean {
  return pathname === "/imports" || pathname.startsWith("/imports/");
}

export function shouldShowDocumentImportTopBarIsland(options: {
  pathname: string;
  canView: boolean;
  magicImportActive: boolean;
  motorImportReviewActive: boolean;
  /** Empty motors / warehouse / sold — keep a single clear CTA in open space. */
  allowOnDenseChrome: boolean;
}): boolean {
  if (!options.canView) return false;
  if (options.magicImportActive || options.motorImportReviewActive) return false;
  if (isDocumentImportReviewRoute(options.pathname)) return false;

  if (isDenseInventoryChromeRoute(options.pathname)) {
    return options.allowOnDenseChrome;
  }

  return true;
}
