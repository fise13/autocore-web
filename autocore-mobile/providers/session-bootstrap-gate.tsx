import { memo, useEffect, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';

import { AuthLoadingScreen } from '@/authentication/auth-loading-screen';
import { resetAppShellReady, setAppShellReady } from '@/lib/app-shell-ready';
import { isProductionCompanyId, normalizeCompanyId } from '@/lib/company-id';
import { markStartup } from '@/lib/performance/startup-tracer';
import {
  flushScheduledQueryDataApplies,
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

/** Avoid a one-frame flash when disk cache is already hot. */
const MIN_LOADING_MS = 220;
/** Catalog must stay quiet this long after the last apply. */
const QUIET_MS = 120;
/** Absolute fail-open so a stuck listener can never soft-lock the splash. */
const FAILSAFE_MS = 8_000;
const POLL_MS = 50;

/**
 * Keeps children mounted at all times (the navigator is never re-parented or
 * remounted) and lays an opaque, touch-blocking loader on top until the session
 * data has settled and the JS thread is idle. Removing the overlay is the only
 * transition — there is no navigator remount, which previously caused hard exits.
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

  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);

  useEffect(() => {
    if (!needsBootstrap || !companyId) {
      // Login / onboarding — nothing to wait for.
      revealedRef.current = true;
      setShellRevealed(true);
      setAppShellReady(true);
      setRevealed(true);
      hideNativeSplashAndLogStartup();
      return;
    }

    // New workspace session — block until bootstrap settles.
    revealedRef.current = false;
    setRevealed(false);
    setShellRevealed(false);
    resetAppShellReady();

    let cancelled = false;
    const startedAt = Date.now();

    const reveal = () => {
      if (cancelled || revealedRef.current) return;
      revealedRef.current = true;
      flushScheduledQueryDataApplies();
      setShellRevealed(true);
      setAppShellReady(true);
      markStartup('tabs_interactive');
      hideNativeSplashAndLogStartup();
      // Let the current frame finish, then drop the overlay so the first touch lands live.
      InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        setRevealed(true);
      });
    };

    const tick = () => {
      if (cancelled || revealedRef.current) return;

      const elapsed = Date.now() - startedAt;
      flushScheduledQueryDataApplies();

      const bootstrap = getSessionBootstrapStatus(companyId);

      // Listeners can be ready from disk cache without a fresh apply event —
      // start the quiet clock so the settle check can progress.
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
        reveal();
        return;
      }

      setTimeout(tick, POLL_MS);
    };

    const kickoff = setTimeout(tick, POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(kickoff);
    };
  }, [needsBootstrap, companyId]);

  const showOverlay = needsBootstrap && !revealed;

  return (
    <View style={styles.root}>
      {children}
      {showOverlay ? (
        <View style={styles.overlay} pointerEvents="auto">
          <AuthLoadingScreen message="Setting up your workspace…" />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999999,
    elevation: 999999,
  },
});
