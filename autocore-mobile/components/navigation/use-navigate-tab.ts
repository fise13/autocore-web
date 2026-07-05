import { useRouter, useSegments } from 'expo-router';
import { useCallback } from 'react';

import {
  resolveTabRouteName,
  type TabRouteName,
  useTabTransition,
} from '@/components/navigation/tab-transition-context';
import { tabNavigationGuard } from '@/lib/navigation/navigation-guard';

export type TabNavigateTarget =
  | string
  | {
      pathname: string;
      params?: Record<string, string>;
    };

function resolveTabFromHref(href: string): TabRouteName | null {
  const normalized = href.replace(/^\//, '');
  if (normalized.startsWith('(tabs)/')) {
    const rest = normalized.slice('(tabs)/'.length);
    return resolveTabRouteName(rest.split('/')[0] ?? '');
  }
  return resolveTabRouteName(normalized.split('/')[0] ?? '');
}

function resolveCurrentTab(segments: readonly string[]): TabRouteName | null {
  const tabsIndex = segments.indexOf('(tabs)');
  if (tabsIndex < 0) return null;
  const name = segments[tabsIndex + 1];
  if (!name) return 'index';
  return resolveTabRouteName(name);
}

/** Tab navigation with the same slide/fade transition as the custom tab bar. */
export function useNavigateTab() {
  const router = useRouter();
  const segments = useSegments();
  const { beginTransition } = useTabTransition();

  return useCallback(
    (target: TabNavigateTarget) => {
      const pathname = typeof target === 'string' ? target : target.pathname;
      const params = typeof target === 'string' ? undefined : target.params;

      tabNavigationGuard.tryNavigate(() => {
        const fromTab = resolveCurrentTab(segments) ?? 'index';
        const toTab = resolveTabFromHref(pathname);
        if (toTab && fromTab !== toTab) {
          beginTransition(fromTab, toTab);
        }

        if (params) {
          router.navigate({ pathname, params } as never);
          return;
        }
        router.navigate(pathname as never);
      });
    },
    [beginTransition, router, segments],
  );
}
