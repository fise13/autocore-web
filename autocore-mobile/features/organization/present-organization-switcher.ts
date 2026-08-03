import type { Href } from 'expo-router';

import { presentNativeMenu } from '@/components/ui/native-context-menu';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { formatRole } from '@/lib/team/format';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { NotificationService } from '@/services/notifications';
import type { UserCompanyMembership } from '@/types/rbac';

const JOIN_ACTION_ID = '__join_company__';

type PresentOrganizationSwitcherArgs = {
  memberships: UserCompanyMembership[];
  activeCompanyId: string | null | undefined;
  userId: string | null | undefined;
  refreshProfile: () => Promise<void> | void;
  router: { push: (href: Href) => void };
  joinHref?: Href;
};

/**
 * System organization picker — ActionSheetIOS on iOS, Alert on Android.
 * Replaces the custom Gorhom company switcher sheet.
 */
export function presentOrganizationSwitcher({
  memberships,
  activeCompanyId,
  userId,
  refreshProfile,
  router,
  joinHref = '/(tabs)/profile/join-company',
}: PresentOrganizationSwitcherArgs): void {
  if (memberships.length === 0) return;

  const actions = [
    ...memberships.map((membership) => {
      const label = resolveActiveCompanyName(membership.companyId, membership.name, []);
      const role = formatRole(membership.role);
      const active = membership.companyId === activeCompanyId;
      return {
        id: membership.companyId,
        title: `${label} · ${role}`,
        selected: active,
      };
    }),
    {
      id: JOIN_ACTION_ID,
      title: 'Join a company',
    },
  ];

  presentNativeMenu({
    title: 'Organizations',
    actions,
    onPressAction: (id) => {
      if (id === JOIN_ACTION_ID) {
        router.push(joinHref);
        return;
      }
      if (!userId || id === activeCompanyId) return;
      void (async () => {
        await switchActiveCompany(userId, id);
        await refreshProfile();
        await NotificationService.syncInbox();
      })();
    },
  });
}
