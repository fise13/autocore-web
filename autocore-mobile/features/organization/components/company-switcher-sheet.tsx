import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { useAuth } from '@/authentication/auth-provider';
import { SettingsLinkRow, Text } from '@/components/ui';
import { useCompanySubscription, useSession, useTheme } from '@/hooks';
import { subscriptionPlanLabel } from '@/lib/billing/format-renewal';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { formatRole } from '@/lib/team/format';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { NotificationService } from '@/services/notifications';
import { rhythm } from '@/theme';

import { OrganizationMembershipRow } from './organization-membership-row';

type CompanySwitcherSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function CompanySwitcherSheet({ open, onClose }: CompanySwitcherSheetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { firebaseUser, memberships, refreshProfile } = useAuth();
  const { profile } = useSession();
  const { isPro } = useCompanySubscription(profile?.companyId);
  const snapPoints = useMemo(() => ['42%', '68%'], []);

  if (!open) return null;

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="body" style={styles.headerTitle}>
            Рабочие пространства
          </Text>
          <Text variant="caption" color="muted">
            План: {subscriptionPlanLabel(isPro)}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          {memberships.map((membership, index) => {
            const active = membership.companyId === profile?.companyId;
            const label = resolveActiveCompanyName(membership.companyId, membership.name, []);
            const subtitle = active
              ? `${formatRole(membership.role)} · активно`
              : formatRole(membership.role);

            return (
              <OrganizationMembershipRow
                key={membership.companyId}
                companyId={membership.companyId}
                title={label}
                subtitle={subtitle}
                active={active}
                bordered={index > 0}
                onPress={
                  active
                    ? undefined
                    : async () => {
                        if (!firebaseUser) return;
                        await switchActiveCompany(firebaseUser.uid, membership.companyId);
                        await refreshProfile();
                        await NotificationService.syncInbox();
                        onClose();
                      }
                }
              />
            );
          })}

          <SettingsLinkRow
            bordered={memberships.length > 0}
            title="Присоединиться к компании"
            subtitle="Ссылка или код"
            onPress={() => {
              onClose();
              router.push('/(tabs)/profile/join-company' as never);
            }}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: rhythm.pad,
    paddingBottom: rhythm.section,
    gap: rhythm.stack,
  },
  header: {
    gap: 2,
    paddingTop: rhythm.tight,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  card: {
    borderRadius: rhythm.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
