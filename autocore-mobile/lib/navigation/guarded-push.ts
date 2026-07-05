import type { Href } from 'expo-router';

import { navigationHrefKey } from '@/lib/navigation/href-key';
import { stackNavigationGuard } from '@/lib/navigation/stack-navigation-guard';

type PushRouter = { push: (href: Href) => void };

/** Single stack push — blocks duplicate taps until destination focuses. */
export function guardedPush(router: PushRouter, href: Href): void {
  const key = navigationHrefKey(href);
  stackNavigationGuard.tryPush(key, () => {
    router.push(href);
  });
}
