import type { Href } from 'expo-router';

/** Stable string key for deduplicating in-flight stack navigations. */
export function navigationHrefKey(href: Href): string {
  if (typeof href === 'string') {
    return href.replace(/\/$/, '') || '/';
  }

  const pathname = (href.pathname ?? '').replace(/\/$/, '') || '/';
  if (!href.params || Object.keys(href.params).length === 0) {
    return pathname;
  }

  const search = new URLSearchParams(
    Object.entries(href.params).map(([key, value]) => [key, String(value)]),
  ).toString();

  return search ? `${pathname}?${search}` : pathname;
}
