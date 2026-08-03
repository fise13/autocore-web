import { memo, useEffect, useRef } from 'react';

import { resetAppShellReady, setAppShellReady } from '@/lib/app-shell-ready';
import { isProductionCompanyId, normalizeCompanyId } from '@/lib/company-id';
import { markStartup } from '@/lib/performance/startup-tracer';
import {
  getMsSinceLastCatalogApply,
  getPendingQueryDataApplyCount,
  hasSeenCatalogApply,
  markCatalogApplyNow,
  setShellRevealed,
} from '@/lib/realtime/query-data-scheduler';
import { getSessionBootstrapStatus } from '@/lib/realtime/subscription-registry';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { hideNativeSplashAndLogStartup } from '@/lib/splash';
import { useAuthStore } from '@/store/auth-store';

const MIN_LOADING_MS = 120;
const QUIET_MS = 60;
/** Fail-open quickly — never soft-lock interactivity waiting on listeners. */
const FAILSAFE_MS = 600;
const POLL_MS = 50;

/**
 * Marks the app shell ready once session catalogs settle.
 *
 * Intentionally does NOT mount a touch-blocking overlay. NativeTabs live above
 * the RN tree; an absoluteFill `pointerEvents="auto"` loader made every RN
 * button dead for ~1s while the tab bar stayed instant. Splash covers cold
 * start; after that the navigator must stay tappable.
 */
export const SessionBootstrapGate = memo(function SessionBootstrapGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);
  const status = useAuthStore((s) => s.status);

  const sessionCompanyId = resolveSessionCompanyId(profile, memberships);
  const companyId = sessionCompanyId ? normalizeCompanyId(sessionCompanyId) : null;
  const needsBootstrap =
    status === 'authenticated' && isProductionCompanyId(sessionCompanyId);

  const readyCompanyRef = useRef<string | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      readyCompanyRef.current = null;
      settledRef.current = false;
      setShellRevealed(false);
      resetAppShellReady();
      return;
    }

    if (!needsBootstrap || !companyId) {
      // Login / onboarding, or transient null companyId — do not tear down a
      // workspace that already settled (auth hydration can briefly clear memberships).
      if (readyCompanyRef.current) {
        return;
      }
      settledRef.current = true;
      setShellRevealed(true);
      setAppShellReady(true);
      hideNativeSplashAndLogStartup();
      return;
    }

    if (settledRef.current && readyCompanyRef.current === companyId) {
      return;
    }

    // Real company switch — resettle without blocking touches.
    if (readyCompanyRef.current && readyCompanyRef.current !== companyId) {
      settledRef.current = false;
      setShellRevealed(false);
      resetAppShellReady();
    }

    let cancelled = false;
    const startedAt = Date.now();
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const settle = () => {
      if (cancelled || settledRef.current) return;
      settledRef.current = true;
      readyCompanyRef.current = companyId;
      // Do not flush large catalogs on this frame — let the scheduler drain
      // in slices so the first taps stay on the JS thread.
      setShellRevealed(true);
      setAppShellReady(true);
      markStartup('tabs_interactive');
      hideNativeSplashAndLogStartup();
    };

    const tick = () => {
      if (cancelled || settledRef.current) return;

      const elapsed = Date.now() - startedAt;
      const bootstrap = getSessionBootstrapStatus(companyId);

      if (bootstrap.ready && !hasSeenCatalogApply()) {
        markCatalogApplyNow();
      }

      const pendingApplies = getPendingQueryDataApplyCount();
      const sinceApply = getMsSinceLastCatalogApply();
      const catalogQuiet =
        !hasSeenCatalogApply() ||
        (pendingApplies === 0 && sinceApply >= QUIET_MS);

      const dataReady = bootstrap.ready && pendingApplies === 0 && catalogQuiet;

      if (elapsed >= FAILSAFE_MS || (elapsed >= MIN_LOADING_MS && dataReady)) {
        settle();
        return;
      }

      pollTimer = setTimeout(tick, POLL_MS);
    };

    pollTimer = setTimeout(tick, POLL_MS);

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [needsBootstrap, companyId, status]);

  return <>{children}</>;
});
