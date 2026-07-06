import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { useAuth } from '@/authentication/auth-provider';
import { Button, Text } from '@/components/ui';
import { useCompanySubscription, useSession, useTheme } from '@/hooks';
import { subscriptionPlanLabel } from '@/lib/billing/format-renewal';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { NotificationService } from '@/services/notifications';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

type CompanySwitcherSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function CompanySwitcherSheet({ open, onClose }: CompanySwitcherSheetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { firebaseUser, memberships, refreshProfile } = useAuth();
  const { profile, companyId } = useSession();
  const { isPro } = useCompanySubscription(companyId);
  const snapPoints = useMemo(() => ['45%', '70%'], []);

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
      <BottomSheetScrollView contentContainerStyle={{ padding: rhythm.stack, gap: rhythm.inline }}>
        <Text variant="title">Рабочие пространства</Text>
        <Text variant="caption" color="muted">
          Текущий план: {subscriptionPlanLabel(isPro)}
        </Text>
        {memberships.map((membership) => {
          const active = membership.companyId === profile?.companyId;
          const label = resolveActiveCompanyName(membership.companyId, membership.name, []);
          return (
            <Pressable
              key={membership.companyId}
              onPress={async () => {
                if (!firebaseUser || active) {
                  onClose();
                  return;
                }
                haptics.selection();
                await switchActiveCompany(firebaseUser.uid, membership.companyId);
                await refreshProfile();
                await NotificationService.syncInbox();
                onClose();
              }}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? toneBackground(colors.primary, 0.08) : colors.background,
                padding: rhythm.inline,
                gap: 4,
              }}
            >
              <Text variant="bodyStrong">{label}</Text>
              <Text variant="caption" color="muted">
                {membership.role}
                {active ? ' · активно' : ''}
              </Text>
            </Pressable>
          );
        })}
        <Button
          variant="outline"
          onPress={() => {
            onClose();
            router.push('/(tabs)/profile/join-company' as never);
          }}
        >
          Присоединиться к компании
        </Button>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
