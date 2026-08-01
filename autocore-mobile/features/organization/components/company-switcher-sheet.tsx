import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/authentication/auth-provider';
import { SettingsLinkRow, Text } from '@/components/ui';
import { useModalBottomSheet, useSession, useTheme } from '@/hooks';
import { useEntitlement } from '@/hooks/use-entitlement';
import { planLabel } from '@/lib/subscriptions/format';
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
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const sheet = useModalBottomSheet();
  const { firebaseUser, memberships, refreshProfile } = useAuth();
  const { profile } = useSession();
  const { entitlement } = useEntitlement();
  const snapPoints = useMemo(() => ['42%', '68%'], []);

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
      return;
    }
    sheetRef.current?.dismiss();
  }, [open]);

  const contentStyle = useMemo(
    () => ({
      ...styles.content,
      paddingBottom: Math.max(insets.bottom, rhythm.section),
    }),
    [insets.bottom],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      {...sheet.sheetLayout}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={sheet.renderBackdrop}
      backgroundStyle={sheet.backgroundStyle}
      handleIndicatorStyle={sheet.handleIndicatorStyle}
    >
      <BottomSheetScrollView contentContainerStyle={contentStyle}>
        <View style={styles.header}>
          <Text
            variant="heading"
            style={{
              fontSize: 22,
              fontWeight: '700',
              letterSpacing: -0.45,
              lineHeight: 28,
              color: colors.foreground,
            }}
          >
            Workspaces
          </Text>
          <Text
            variant="caption"
            style={{ fontSize: 14, lineHeight: 20, color: colors.mutedForeground }}
          >
            {planLabel(entitlement)} plan
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
              ? `${formatRole(membership.role)} · active`
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
            title="Join a company"
            subtitle="Link or code"
            onPress={() => {
              onClose();
              router.push('/(tabs)/profile/join-company' as never);
            }}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: rhythm.pad,
    gap: rhythm.stack,
  },
  header: {
    gap: 4,
    paddingTop: rhythm.tight,
    marginBottom: 4,
  },
  card: {
    borderRadius: rhythm.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
