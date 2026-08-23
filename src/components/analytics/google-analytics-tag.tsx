"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

import { isAnalyticsEnabled, resolveMeasurementId } from "@/lib/analytics/ga-config";

/**
 * Loads the Google tag for whichever host the page is being served from.
 *
 * The host is read on the client, after mount, on purpose. Marketing and the
 * product are one Next app on two domains, so the id can differ per request —
 * but resolving that server-side means `headers()` in the root layout, which
 * would turn every statically rendered marketing page dynamic. Those pages are
 * the ones competing for search position, so a few milliseconds of delay before
 * the tag loads is the cheaper trade.
 *
 * Rendering nothing on the server and the tag on the client is also what keeps
 * this free of hydration mismatches.
 */
export function GoogleAnalyticsTag() {
  const [measurementId, setMeasurementId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    const resolved = resolveMeasurementId(window.location.hostname);
    if (resolved) setMeasurementId(resolved);
  }, []);

  if (!measurementId) return null;

  return <GoogleAnalytics gaId={measurementId} />;
}
