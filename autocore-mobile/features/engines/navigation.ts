import type { Href } from 'expo-router';

import { navigationHrefKey } from '@/lib/navigation/href-key';
import { stackNavigationGuard } from '@/lib/navigation/stack-navigation-guard';

import type { EngineListFilter } from './lib/engine-lane';

/** Prefill for the add-engine composer — a scanned serial, a known variant. */
export type NewEnginePreset = {
  serial?: string;
  brand?: string;
  code?: string;
  location?: string;
};

export function newEngineHref(preset?: NewEnginePreset): Href {
  const params: Record<string, string> = {};
  if (preset?.serial) params.serial = preset.serial;
  if (preset?.brand) params.brand = preset.brand;
  if (preset?.code) params.code = preset.code;
  if (preset?.location) params.location = preset.location;

  return { pathname: '/objects/new', params } as Href;
}

export function enginesListHref(filter?: EngineListFilter): Href {
  if (!filter) return '/objects/engines' as Href;
  return { pathname: '/objects/engines', params: { filter } } as Href;
}

type EnginesRouter = {
  push: (href: Href) => void;
  replace: (href: Href) => void;
  navigate: (href: Href) => void;
  dismissTo?: (href: Href) => void;
};

/**
 * Open the Engines catalog without stacking duplicate screens.
 * Incoming is the former intake bay.
 */
export function openEnginesList(
  router: EnginesRouter,
  options?: { filter?: EngineListFilter },
): void {
  const href = enginesListHref(options?.filter);
  const key = navigationHrefKey(href);
  stackNavigationGuard.tryPush(key, () => {
    if (typeof router.dismissTo === 'function') {
      try {
        router.dismissTo(href);
        return;
      } catch {
        // Fall through when dismissTo cannot target this route.
      }
    }
    router.navigate(href);
  });
}
