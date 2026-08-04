import type { Href } from 'expo-router';

/**
 * Opens the premium organization switcher form sheet.
 * Memberships / active company are read inside the screen from auth session.
 */
export function presentOrganizationSwitcher({
  router,
}: {
  memberships?: unknown;
  activeCompanyId?: string | null;
  userId?: string | null;
  refreshProfile?: () => Promise<void> | void;
  router: { push: (href: Href) => void };
  joinHref?: Href;
}): void {
  router.push('/switch-organization' as Href);
}
