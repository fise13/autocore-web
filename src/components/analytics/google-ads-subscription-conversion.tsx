"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { getConsent, getServerConsent, subscribeConsent } from "@/lib/analytics/consent";
import { isSubscriptionThankYou, trackGoogleAdsSubscriptionConversion } from "@/lib/analytics/events";

/**
 * Google Ads event snippet for the "Подписка" conversion page.
 *
 * Overlay checkout already fires this from Paddle `checkout.completed`. The
 * thank-you routes cover the redirect path (`successUrl`) when that event
 * never arrived. Both share a per-tab lock so they cannot double-count.
 */
export function GoogleAdsSubscriptionConversion() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");

  useEffect(() => {
    if (consent !== "granted") return;
    if (!isSubscriptionThankYou(pathname, checkout)) return;

    const tryFire = (): boolean => {
      const gtag = (window as Window & { gtag?: unknown }).gtag;
      if (typeof gtag !== "function") return false;
      trackGoogleAdsSubscriptionConversion();
      return true;
    };

    if (tryFire()) return;

    const interval = window.setInterval(() => {
      if (tryFire()) window.clearInterval(interval);
    }, 250);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 8_000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [checkout, consent, pathname]);

  return null;
}
