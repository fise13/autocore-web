import type { Href } from 'expo-router';

export type FinanceSettingsReturnTo = 'accounting' | 'hub';

const RETURN_HREFS = {
  accounting: '/(tabs)/accounting',
  hub: '/(tabs)/profile',
} as const satisfies Record<FinanceSettingsReturnTo, string>;

const RETURN_TO_KEYS = new Set<string>(Object.keys(RETURN_HREFS));

export function financeSettingsHref(returnTo: FinanceSettingsReturnTo): Href {
  return {
    pathname: '/(tabs)/profile/finance',
    params: { returnTo },
  } as Href;
}

export function resolveFinanceSettingsReturnHref(
  returnTo: string | string[] | undefined,
): Href {
  const key = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (key && RETURN_TO_KEYS.has(key)) {
    return RETURN_HREFS[key as FinanceSettingsReturnTo] as Href;
  }
  return RETURN_HREFS.hub as Href;
}

type OpenFinanceSettingsRouter = {
  push: (href: Href) => void;
};

/** Opens finance settings with an explicit back target — avoids broken cross-tab history. */
export function openFinanceSettings(
  router: OpenFinanceSettingsRouter,
  options: { returnTo?: FinanceSettingsReturnTo } = {},
): void {
  router.push(financeSettingsHref(options.returnTo ?? 'accounting'));
}
