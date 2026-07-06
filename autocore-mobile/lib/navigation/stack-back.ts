import type { Href } from 'expo-router';

export const PROFILE_SETTINGS_HUB_HREF = '/(tabs)/profile' as Href;

type StackBackRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
};

/** Pop one screen, or replace with the settings hub when stack history is missing. */
export function goBackOrReplace(
  router: StackBackRouter,
  fallback: Href = PROFILE_SETTINGS_HUB_HREF,
): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
