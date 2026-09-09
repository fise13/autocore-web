"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { isSubscriptionThankYou, trackGoogleAdsSubscriptionConversion } from "@/lib/analytics/events";

/**
 * Google Ads `gtag('event', 'conversion')` for SPA thank-you routes.
 *
 * `/welcome` already ships the same snippet in HTML so Ads' scanner can see
 * it. Overlay checkout fires from Paddle `checkout.completed`. This covers
 * `?checkout=success` after client navigation. All three share a per-tab lock.
 *
 * Does not wait for the cookie banner: Consent Mode is already on the Google
 * tag, and Ads' crawler never clicks Accept.
 */
export function GoogleAdsSubscriptionConversion() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");

  useEffect(() => {
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
  }, [checkout, pathname]);

  return null;
}
