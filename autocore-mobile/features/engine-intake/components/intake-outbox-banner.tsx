import { Pressable, View } from 'react-native';

import { AlertTriangleIcon, ChevronRightIcon, CloudIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { minTouchTarget, spacing, tokens } from '@/theme';

export type IntakeOutboxBannerProps = {
  pendingCount: number;
  failedCount: number;
  syncing: boolean;
  issue: string | null;
  needsDeploy: boolean;
  onPress: () => void;
};

export function IntakeOutboxBanner({
  pendingCount,
  failedCount,
  syncing,
  issue,
  needsDeploy,
  onPress,
}: IntakeOutboxBannerProps) {
  const { colors } = useTheme();

  if (pendingCount <= 0 && failedCount <= 0) return null;

  const alert = failedCount > 0 || needsDeploy;
  const title = needsDeploy
    ? 'Web API not deployed — sync is blocked'
    : failedCount > 0
      ? failedCount === 1
        ? '1 item needs attention'
        : `${failedCount} items need attention`
      : syncing
        ? 'Syncing Warehouse work'
        : pendingCount === 1
          ? '1 item waiting to sync'
          : `${pendingCount} items waiting to sync`;
  const actionHint = failedCount > 0 || needsDeploy ? 'Tap to clear or retry' : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={alert ? 'Clear or retry Warehouse sync' : 'Warehouse sync status'}
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
      </View>
      <ChevronRightIcon
        size={18}
        color={alert ? colors.dangerOnSubtle : colors.primaryOnSubtle}
      />
    </Pressable>
  );
}
