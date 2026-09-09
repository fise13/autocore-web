"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getConsent, getServerConsent, setConsent, subscribeConsent, type ConsentState } from "@/lib/analytics/consent";
import { trackPageView } from "@/lib/analytics/events";
import { isAnalyticsEnabled } from "@/lib/analytics/ga-config";
import { gtagConsentUpdatePayload } from "@/lib/analytics/gtag-bootstrap";
import { getMarketingUrl } from "@/lib/site-urls";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

/**
 * Cookie consent prompt.
 *
 * Shown once, until answered. There is deliberately no dismiss "×": closing a
 * consent prompt without choosing is not consent, and offering it would only
 * produce visitors in an ambiguous state forever.
 *
 * On production the Google tag is already in the page (Consent Mode, storage
 * denied). Accepting here is what grants cookies; declining leaves them denied.
 *
 * The copy names the *purpose* — analytics — rather than the vendor. That is
 * the level of detail a banner is for; which provider does the measuring is in
 * the privacy policy this links to, where there is room to be exact.
 *
 * The answer lives in a cookie on the shared parent domain, so accepting on the
 * marketing site also settles it for the app host — see `lib/analytics/consent`.
 *
 * Transitions are CSS and the unmount is a timer, with no animation library in
 * the path. `AnimatePresence` played the exit here but never removed the node,
 * which left a fully transparent card holding 226px of layout across the bottom
 * of every page — invisible, and swallowing clicks meant for what sat under it.
 * A banner is not worth a dependency that can strand an overlay on the page.
 */

/** `idle` covers the server render and the first client render, before storage
 *  has been read — rendering nothing in both is what keeps hydration matched. */
type Phase = "idle" | "entering" | "shown" | "leaving" | "gone";

/** Kept in step with the `duration-300` class below. */
const EXIT_MS = 300;

export function CookieConsentBanner() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (getConsent() !== "unknown") {
      setPhase("gone");
      return;
    }
    // Mount hidden, then flip on the next frame so the CSS transition has two
    // states to move between instead of starting already in place.
    setPhase("entering");
    const raf = requestAnimationFrame(() => setPhase("shown"));
    return () => cancelAnimationFrame(raf);
  }, []);

  /**
   * Answered — here or in another tab — so start leaving. Never the reverse:
   * a prompt already dealt with must not reopen.
   */
  useEffect(() => {
    if (consent === "unknown") return;
    if (phase !== "entering" && phase !== "shown") return;
    setPhase("leaving");
  }, [consent, phase]);

  /** Unmount once the exit transition has had its time. Owned by its own
   *  effect rather than scheduled inside a state updater, which React is free
   *  to call more than once. */
  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = setTimeout(() => setPhase("gone"), EXIT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "idle" || phase === "gone") return null;

  const copy = userCopy.cookieConsent;
  const privacyHref = `${getMarketingUrl().replace(/\/$/, "")}/legal/privacy`;
  const hidden = phase === "entering" || phase === "leaving";

  const choose = (next: Exclude<ConsentState, "unknown">) => {
    // `setConsent` notifies the effect above, which owns the exit and unmount.
    setConsent(next);
    const gtag = (window as Window & { gtag?: (command: string, ...args: unknown[]) => void }).gtag;
    if (typeof gtag === "function") {
      gtag("consent", "update", gtagConsentUpdatePayload(next));
      gtag("set", "ads_data_redaction", next !== "granted");
    }
    // Path exploration only shows cookied hits. The landing `config` page_view
    // went out with storage denied; this one is the session GA4 will actually
    // draw after the visitor accepts.
    if (next === "granted") trackPageView();
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={copy.title}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 transition-all duration-300 ease-out sm:p-6 motion-reduce:transition-opacity",
        hidden ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100",
        // Once leaving, stop intercepting clicks even before the node goes.
        phase === "leaving" && "pointer-events-none",
      )}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border/80 bg-background/85 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur-xl sm:p-5 dark:bg-background/90 dark:ring-white/5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:flex"
          >
            <Cookie className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{copy.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {copy.body}{" "}
              <a
                href={privacyHref}
                className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
              >
                {copy.privacyLink}
              </a>
            </p>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => choose("denied")}
                className="sm:min-w-28"
              >
                {copy.decline}
              </Button>
              <Button size="sm" onClick={() => choose("granted")} className="sm:min-w-28">
                {copy.accept}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
