import { useRouter, useSegments, type Href } from 'expo-router';
import { useCallback } from 'react';

import {
  resolveTabRouteName,
  type TabRouteName,
  useTabTransition,
} from '@/components/navigation/tab-transition-context';
import { guardedPush } from '@/lib/navigation/guarded-push';
import { tabNavigationGuard } from '@/lib/navigation/navigation-guard';
import { isRootAppHref } from '@/lib/navigation/tab-specs';

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

function hrefFromTarget(target: TabNavigateTarget): Href {
  if (typeof target === 'string') return target as Href;
  if (target.params) {
    return { pathname: target.pathname, params: target.params } as Href;
  }
  return target.pathname as Href;
}

/** Tab switches stay on the dock; root screens (orders, intake, warehouse) push. */
export function useNavigateTab() {
  const router = useRouter();
  const segments = useSegments();
  const { beginTransition } = useTabTransition();

  return useCallback(
    (target: TabNavigateTarget) => {
      const pathname = typeof target === 'string' ? target : target.pathname;

      if (isRootAppHref(pathname)) {
        guardedPush(router, hrefFromTarget(target));
        return;
      }

      tabNavigationGuard.tryNavigate(() => {
        const fromTab = resolveCurrentTab(segments) ?? 'index';
        const toTab = resolveTabFromHref(pathname);
        if (toTab && fromTab !== toTab) {
          beginTransition(fromTab, toTab);
        }

        if (typeof target === 'string') {
          router.navigate(target as never);
          return;
        }
        if (target.params) {
          router.navigate({ pathname: target.pathname, params: target.params } as never);
          return;
        }
        router.navigate(target.pathname as never);
      });
    },
    [beginTransition, router, segments],
  );
}
