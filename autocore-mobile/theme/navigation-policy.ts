/**
 * Route-category navigation policy — attach one contract per stack screen.
 * See DESIGN.md → Route categories.
 */

import { tokens } from './tokens';

export type RouteCategory =
  | 'tabRoot'
  | 'drillIn'
  | 'modalTask'
  | 'pageSheet'
  | 'formSheet'
  | 'immersive';

export type NavigationPolicy = {
  category: RouteCategory;
  /** Prefer native large titles on tab roots. */
  largeTitle: boolean;
  /** Prefer native stack header over custom chrome. */
  nativeHeader: boolean;
  animation: 'fade' | 'slide_from_right' | 'slide_from_bottom' | 'default' | 'none';
  fullScreenGestureEnabled: boolean;
  gestureEnabled: boolean;
  /** Native stack presentation. */
  presentation?: 'card' | 'modal' | 'formSheet' | 'fullScreenModal' | 'transparentModal';
};

export const navigationPolicy: Record<RouteCategory, NavigationPolicy> = {
  tabRoot: {
    category: 'tabRoot',
    largeTitle: true,
    nativeHeader: true,
    animation: 'fade',
    fullScreenGestureEnabled: false,
    gestureEnabled: false,
  },
  drillIn: {
    category: 'drillIn',
    largeTitle: false,
    nativeHeader: true,
    animation: 'slide_from_right',
    fullScreenGestureEnabled: true,
    gestureEnabled: true,
  },
  /** iOS stacked card — parent scales back, sheet slides up (Apple page sheet). */
  pageSheet: {
    category: 'pageSheet',
    largeTitle: false,
    nativeHeader: true,
    animation: 'slide_from_bottom',
    fullScreenGestureEnabled: true,
    gestureEnabled: true,
    presentation: 'modal',
  },
  /**
   * Native form sheet over the active tab — grabber, detents, parent stays
   * visible behind (continuation of NativeTabs, not a full-screen takeover).
   */
  formSheet: {
    category: 'formSheet',
    largeTitle: false,
    nativeHeader: true,
    animation: 'slide_from_bottom',
    fullScreenGestureEnabled: true,
    gestureEnabled: true,
    presentation: 'formSheet',
  },
  modalTask: {
    category: 'modalTask',
    largeTitle: false,
    nativeHeader: true,
    animation: 'slide_from_bottom',
    fullScreenGestureEnabled: true,
    gestureEnabled: true,
    presentation: 'fullScreenModal',
  },
  immersive: {
    category: 'immersive',
    largeTitle: false,
    nativeHeader: false,
    animation: 'fade',
    fullScreenGestureEnabled: false,
    gestureEnabled: false,
  },
};

/** Expo Router Stack.Screen options derived from a category. */
export function stackOptionsFor(category: RouteCategory) {
  const policy = navigationPolicy[category];
  return {
    headerShown: policy.nativeHeader,
    animation: policy.animation,
    gestureEnabled: policy.gestureEnabled,
    fullScreenGestureEnabled: policy.fullScreenGestureEnabled,
    ...(policy.presentation ? { presentation: policy.presentation } : null),
    ...(policy.largeTitle
      ? {
          headerLargeTitle: true,
          headerTransparent: false,
        }
      : null),
  } as const;
}

/**
 * Native iOS/Android form-sheet chrome for compose flows that should feel like
 * a continuation of the tab underneath (grabber + detents + rounded card).
 *
 * Defaults: open fully, rest at half when dragged down, dismiss past half.
 */
export function formSheetScreenOptions(overrides?: {
  detents?: number[];
  initialDetentIndex?: number | 'last';
  cornerRadius?: number;
}) {
  const base = stackOptionsFor('formSheet');
  return {
    ...base,
    /** Half + full — drag down parks at ~50%, open always starts at full. */
    sheetAllowedDetents: overrides?.detents ?? [0.5, 1],
    sheetInitialDetentIndex: overrides?.initialDetentIndex ?? 'last',
    sheetGrabberVisible: true,
    sheetCornerRadius: overrides?.cornerRadius ?? tokens.radius.sheet,
    sheetExpandsWhenScrolledToEdge: true,
    headerShadowVisible: false,
  } as const;
}
