"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackPageView } from "@/lib/analytics/events";

/**
 * GA4 page views for client-side navigations.
 *
 * The document snippet's `gtag('config')` already sends the first hit. Barba
 * and the App Router then change the path without a reload — without this,
 * Path exploration stops at `/` even when the visitor opened `/pricing`.
 */
export function GoogleAnalyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (lastKeyRef.current === null) {
      lastKeyRef.current = key;
      return;
    }
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    trackPageView();
  }, [pathname, searchParams]);

  return null;
}
