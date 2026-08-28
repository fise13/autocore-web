import { Pressable, View } from 'react-native';

import { AlertTriangleIcon, ChevronRightIcon, CloudIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { intakeOutboxBannerCopy } from '@/features/engine-intake/lib/intake-outbox-banner-copy';
import { useTheme } from '@/hooks';
import { minTouchTarget, spacing, tokens } from '@/theme';

export type IntakeOutboxBannerProps = {
  photoPendingCount: number;
  photoFailedCount: number;
  syncing: boolean;
  issue: string | null;
  needsDeploy: boolean;
  onPress: () => void;
};

export function IntakeOutboxBanner({
  photoPendingCount,
  photoFailedCount,
  syncing,
  issue,
  needsDeploy,
  onPress,
}: IntakeOutboxBannerProps) {
  const { colors } = useTheme();
  const copy = intakeOutboxBannerCopy({
    photoPending: photoPendingCount,
    photoFailed: photoFailedCount,
    syncing,
    needsDeploy,
  });

  if (!copy.visible) return null;

  const alert = copy.alert;
  const title = copy.title;
  const actionHint = photoFailedCount > 0 || needsDeploy ? 'Tap to try again' : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={alert ? 'Try these photos again' : 'Engine photo status'}
      accessibilityHint={actionHint}
      onPress={onPress}
      style={{
        minHeight: minTouchTarget,
        marginHorizontal: spacing[4],
        marginBottom: spacing[2],
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[3],
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        borderRadius: tokens.radius.group,
        backgroundColor: alert ? colors.dangerSubtle : colors.primarySubtle,
      }}
    >
      {alert ? (
        <AlertTriangleIcon size={20} color={colors.dangerOnSubtle} />
      ) : (
        <CloudIcon size={20} color={colors.primaryOnSubtle} />
      )}
      <View style={{ flex: 1 }}>
        <Text
          variant="caption"
          style={{
            color: alert ? colors.dangerOnSubtle : colors.primaryOnSubtle,
            fontWeight: '700',
          }}
        >
          {title}
        </Text>
        {issue || actionHint ? (
          <Text
            variant="caption"
            numberOfLines={2}
            style={{
              color: alert ? colors.dangerOnSubtle : colors.primaryOnSubtle,
              marginTop: 2,
            }}
          >
            {issue ?? actionHint}
          </Text>
        ) : null}
      </View>
      <ChevronRightIcon
        size={18}
        color={alert ? colors.dangerOnSubtle : colors.primaryOnSubtle}
      />
    </Pressable>
  );
}
