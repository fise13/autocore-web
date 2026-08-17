import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  type ViewProps,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hideNativeSplashOnce } from '@/lib/splash';
import { tokens } from '@/theme/tokens';

import {
  AuthBrandMark,
  LOGIN_BRAND_CENTER_FROM_TOP,
  SPLASH_TO_LOGIN_SCALE,
} from './auth-brand-mark';

/**
 * App `colors.background` — keep splash free of `@/hooks` / theme barrels.
 * @see packages/design-tokens/src/colors.ts
 */
const BG_LIGHT = '#f5f7fb';
const BG_DARK = '#0d0e12';
const PRIMARY_LIGHT = '#0a73f2';
const PRIMARY_DARK = '#4d96ff';

/** Quiet signature — muted foreground weight on app background. */
const SIGNATURE_LIGHT = 'rgba(17, 19, 26, 0.28)';
const SIGNATURE_DARK = 'rgba(245, 245, 247, 0.28)';

/**
 * Optical lift of the logo above geometric center.
 * Whisper only — Claude sits near true mid.
 */
const OPTICAL_OFFSET_Y = -6;

/**
 * Breathing room above the home indicator — Claude “BY ANTHROPIC” rhythm.
 */
const SIGNATURE_BOTTOM_GAP = 36;

const ENTER_LOCKUP_MS = 880;
const ENTER_SIGNATURE_MS = 720;
const ENTER_SIGNATURE_DELAY = 200;
const ENTER_SCALE_DELAY = 40;

const EXIT_DISSOLVE_MS = 480;
const REDUCED_EXIT_MS = 180;

/** Claude-paced rise: lockup travels, then crossfades into login mark. */
const EXIT_RISE_SETTLE_MS = 920;
const EXIT_RISE_BG_DELAY = 240;
const EXIT_RISE_BG_MS = 800;
const EXIT_RISE_SIGNATURE_MS = 360;
const EXIT_RISE_LOCKUP_FADE_MS = 280;
const EXIT_RISE_LOCKUP_FADE_DELAY = 700;

/** Total rise exit ceiling (bg delay + fade, lockup travel). */
export const SPLASH_RISE_EXIT_MS =
  Math.max(EXIT_RISE_SETTLE_MS, EXIT_RISE_BG_DELAY + EXIT_RISE_BG_MS) + 80;

const enterEase = Easing.bezier(0.22, 1, 0.36, 1);
const exitEase = Easing.bezier(0.4, 0, 0.2, 1);

export type SplashExitMode = 'dissolve' | 'rise';

export type AuthSplashSurfaceProps = ViewProps & {
  compact?: boolean;
  /**
   * Thin account-hydration track. Cold boot / returning session stays clean.
   */
  showAccountSync?: boolean;
  /** a11y only — never painted. */
  message?: string;
  showAppName?: boolean;
  /**
   * When false, mount already opaque (exit overlay — no re-enter flash).
   * @default true
   */
  appear?: boolean;
  /** Play exit; call `onExitComplete` when finished. */
  exiting?: boolean;
  /**
   * `rise` — unauthenticated handoff (lockup travels to login mark).
   * `dissolve` — fade into app / paywall / auth.
   * @default 'dissolve'
   */
  exitMode?: SplashExitMode;
  onExitComplete?: () => void;
};

/**
 * Premium boot splash — app-background stage, Claude composition + rise handoff.
 *
 * Imports Reanimated directly (not `@/animations` / `@/hooks`) so cold start
 * cannot recurse through UI ↔ hooks barrels.
 */
export function AuthSplashSurface({
  compact = false,
  message = 'Loading',
  showAppName = true,
  appear = true,
  exiting = false,
  exitMode = 'dissolve',
  showAccountSync = false,
  onExitComplete,
  style,
  ...props
}: AuthSplashSurfaceProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const backgroundColor = isDark ? BG_DARK : BG_LIGHT;
  const signatureColor = isDark ? SIGNATURE_DARK : SIGNATURE_LIGHT;
  const insets = useSafeAreaInsets();

  const bgOpacity = useSharedValue(1);
  const lockupOpacity = useSharedValue(appear ? 0 : 1);
  const lockupY = useSharedValue(0);
  const lockupScale = useSharedValue(appear ? 0.96 : 1);
  const signatureOpacity = useSharedValue(appear ? 0 : 1);
  const syncSweep = useSharedValue(0);
  const primary = isDark ? PRIMARY_DARK : PRIMARY_LIGHT;

  const reducedRef = useRef(false);
  const finishedRef = useRef(false);
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;
  const exitModeRef = useRef(exitMode);
  exitModeRef.current = exitMode;

  const finishExit = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onExitCompleteRef.current?.();
  };

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) reducedRef.current = enabled;
    });
    hideNativeSplashOnce();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showAccountSync || exiting) {
      cancelAnimation(syncSweep);
      syncSweep.value = 0;
      return;
    }
    syncSweep.value = 0;
    syncSweep.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(syncSweep);
    };
  }, [exiting, showAccountSync, syncSweep]);

  // Enter — soft fade with a quiet scale settle.
  useEffect(() => {
    if (exiting) return;

    if (!appear) {
      bgOpacity.value = 1;
      lockupOpacity.value = 1;
      lockupY.value = 0;
      lockupScale.value = 1;
      signatureOpacity.value = 1;
      return;
    }

    let cancelled = false;

    const run = (reduced: boolean) => {
      if (cancelled) return;
      bgOpacity.value = 1;
      lockupY.value = 0;
      if (reduced) {
        lockupScale.value = 1;
        lockupOpacity.value = 1;
        signatureOpacity.value = 1;
        return;
      }

      lockupScale.value = 0.96;
      lockupOpacity.value = 0;
      signatureOpacity.value = 0;

      lockupOpacity.value = withTiming(1, { duration: ENTER_LOCKUP_MS, easing: enterEase });
      lockupScale.value = withDelay(
        ENTER_SCALE_DELAY,
        withSpring(1, {
          ...tokens.motion.springs.settle,
          overshootClamping: true,
        }),
      );
      signatureOpacity.value = withDelay(
        ENTER_SIGNATURE_DELAY,
        withTiming(1, { duration: ENTER_SIGNATURE_MS, easing: enterEase }),
      );
    };

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reducedRef.current = enabled;
      run(enabled);
    });

    return () => {
      cancelled = true;
    };
  }, [
    appear,
    bgOpacity,
    exiting,
    lockupOpacity,
    lockupScale,
    lockupY,
    signatureOpacity,
  ]);

  // Exit — dissolve (fade) or Claude rise into login mark.
  useEffect(() => {
    if (!exiting) {
      finishedRef.current = false;
      return;
    }

    let cancelled = false;

    const done = () => {
      if (cancelled) return;
      finishExit();
    };

    cancelAnimation(bgOpacity);
    cancelAnimation(lockupOpacity);
    cancelAnimation(lockupY);
    cancelAnimation(lockupScale);
    cancelAnimation(signatureOpacity);

    if (reducedRef.current) {
      bgOpacity.value = withTiming(
        0,
        { duration: REDUCED_EXIT_MS, easing: exitEase },
        (finished) => {
          if (finished) runOnJS(done)();
        },
      );
      lockupOpacity.value = withTiming(0, {
        duration: REDUCED_EXIT_MS,
        easing: exitEase,
      });
      signatureOpacity.value = withTiming(0, {
        duration: Math.round(REDUCED_EXIT_MS * 0.75),
        easing: exitEase,
      });
      return () => {
        cancelled = true;
        cancelAnimation(bgOpacity);
        cancelAnimation(lockupOpacity);
        cancelAnimation(signatureOpacity);
      };
    }

    const mode = exitModeRef.current;

    if (mode === 'rise') {
      const windowH = Dimensions.get('window').height;
      // Resting optical center = geometric mid + OPTICAL_OFFSET_Y.
      const restingCenterY = windowH / 2 + OPTICAL_OFFSET_Y;
      const targetCenterY = insets.top + LOGIN_BRAND_CENTER_FROM_TOP;
      const riseY = targetCenterY - restingCenterY;
      const failsafeMs = SPLASH_RISE_EXIT_MS + 240;

      // 1) Signature leaves first.
      signatureOpacity.value = withTiming(0, {
        duration: EXIT_RISE_SIGNATURE_MS,
        easing: exitEase,
      });

      // 2) Lockup rises + scales into the login brand slot with a firm,
      // critically-damped landing rather than a purely cinematic timing curve.
      lockupY.value = withSpring(riseY, {
        ...tokens.motion.springs.nav,
        overshootClamping: true,
      });
      lockupScale.value = withSpring(SPLASH_TO_LOGIN_SCALE, {
        ...tokens.motion.springs.nav,
        overshootClamping: true,
      });

      // 3) Stage fades after the rise has started (login paints underneath).
      bgOpacity.value = withDelay(
        EXIT_RISE_BG_DELAY,
        withTiming(0, { duration: EXIT_RISE_BG_MS, easing: exitEase }, (finished) => {
          if (finished) runOnJS(done)();
        }),
      );

      // 4) Crossfade lockup → login mark near the end of travel.
      lockupOpacity.value = withDelay(
        EXIT_RISE_LOCKUP_FADE_DELAY,
        withTiming(0, { duration: EXIT_RISE_LOCKUP_FADE_MS, easing: exitEase }),
      );

      const failsafe = setTimeout(done, failsafeMs);
      return () => {
        cancelled = true;
        clearTimeout(failsafe);
        cancelAnimation(bgOpacity);
        cancelAnimation(lockupOpacity);
        cancelAnimation(lockupY);
        cancelAnimation(lockupScale);
        cancelAnimation(signatureOpacity);
      };
    }

    // Dissolve — calm fade into the screen beneath.
    const failsafeMs = EXIT_DISSOLVE_MS + 220;
    bgOpacity.value = withTiming(0, { duration: EXIT_DISSOLVE_MS, easing: exitEase }, (finished) => {
      if (finished) runOnJS(done)();
    });
    lockupOpacity.value = withTiming(0, {
      duration: Math.round(EXIT_DISSOLVE_MS * 0.92),
      easing: exitEase,
    });
    signatureOpacity.value = withTiming(0, {
      duration: Math.round(EXIT_DISSOLVE_MS * 0.7),
      easing: exitEase,
    });

    const failsafe = setTimeout(done, failsafeMs);

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      cancelAnimation(bgOpacity);
      cancelAnimation(lockupOpacity);
      cancelAnimation(lockupY);
      cancelAnimation(lockupScale);
      cancelAnimation(signatureOpacity);
    };
  }, [
    bgOpacity,
    exiting,
    insets.top,
    lockupOpacity,
    lockupScale,
    lockupY,
    signatureOpacity,
  ]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const lockupStyle = useAnimatedStyle(() => ({
    opacity: lockupOpacity.value,
    transform: [
      { translateY: OPTICAL_OFFSET_Y + lockupY.value },
      { scale: lockupScale.value },
    ],
  }));

  const compactLockupStyle = useAnimatedStyle(() => ({
    opacity: lockupOpacity.value,
    transform: [{ scale: lockupScale.value }],
  }));

  const signatureStyle = useAnimatedStyle(() => ({
    opacity: signatureOpacity.value,
  }));

  const windowW = Dimensions.get('window').width;
  const trackInner = Math.max(120, windowW - 96);
  const fillW = Math.round(trackInner * 0.36);
  const syncFillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: syncSweep.value * (trackInner - fillW) }],
  }));

  if (compact) {
    return (
      <Animated.View
        accessibilityRole="progressbar"
        accessibilityLabel={message}
        style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 32,
            backgroundColor,
          },
          bgStyle,
          style,
        ]}
        {...props}
      >
        {showAppName ? (
          <Animated.View style={compactLockupStyle}>
            <AuthBrandMark size="loading" />
          </Animated.View>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={[styles.fill, style]}
      {...props}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor }, bgStyle]}
      />

      {/* Logo — optical center; rises into login brand on exit. */}
      <View style={styles.stage} pointerEvents="none">
        {showAppName ? (
          <Animated.View style={lockupStyle}>
            <AuthBrandMark size="loading" />
          </Animated.View>
        ) : null}
      </View>

      {/* OPERATIONS — fixed inset above home indicator. */}
      {showAppName ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.signature,
            { paddingBottom: insets.bottom + SIGNATURE_BOTTOM_GAP },
            signatureStyle,
          ]}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
              fontSize: 12,
              fontWeight: '500',
              letterSpacing: 8.5,
              color: signatureColor,
              textTransform: 'uppercase',
              textAlign: 'center',
              ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
            }}
          >
            Operations
          </Text>
        </Animated.View>
      ) : null}

      {showAccountSync ? (
        <View
          pointerEvents="none"
          accessibilityLabel="Syncing account data"
          style={[
            styles.syncTrack,
            { bottom: insets.bottom + 10, backgroundColor: isDark ? 'rgba(77,150,255,0.18)' : 'rgba(10,115,242,0.14)' },
          ]}
        >
          <Animated.View
            style={[
              styles.syncFill,
              { width: fillW, backgroundColor: primary },
              syncFillStyle,
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  signature: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  syncTrack: {
    position: 'absolute',
    left: 48,
    right: 48,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  syncFill: {
    height: 2,
    borderRadius: 1,
  },
});
