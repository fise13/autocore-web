import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CheckCircle2Icon, CloudIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, spacing } from '@/theme';

export type IntakeSessionDoneProps = {
  synced: boolean;
  pendingCount: number;
  topInset: number;
  bottomInset: number;
  onBack: () => void;
};

export function IntakeSessionDone({
  synced,
  pendingCount,
  topInset,
  bottomInset,
  onBack,
}: IntakeSessionDoneProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : FadeIn.duration(duration.medium).easing(autocoreEase);

  return (
    <View
      style={{
        flex: 1,
        paddingTop: topInset + spacing[10],
        paddingBottom: bottomInset + spacing[6],
        paddingHorizontal: spacing[6],
        justifyContent: 'space-between',
        backgroundColor: colors.background,
      }}
    >
      <Animated.View
        entering={entering}
        style={{ gap: spacing[5], alignItems: 'center', paddingTop: spacing[8] }}
      >
        {synced ? (
          <CheckCircle2Icon size={56} color={colors.success} />
        ) : (
          <CloudIcon size={56} color={colors.primary} />
        )}
        <View style={{ gap: spacing[2], alignItems: 'center' }}>
          <Text
            variant="displayTitle"
            style={{ color: colors.foreground, textAlign: 'center', fontWeight: '800' }}
          >
            {synced ? 'In Warehouse' : 'Saved on this phone'}
          </Text>
          <Text
            variant="body"
            style={{ color: colors.mutedForeground, textAlign: 'center', maxWidth: 320 }}
          >
            {synced
              ? 'Condition photos are in Warehouse for the team to review.'
              : `${Math.max(pendingCount, 1)} items will sync when the connection returns.`}
          </Text>
        </View>
      </Animated.View>

      <Button size="xl" onPress={onBack}>
        Back to Warehouse
      </Button>
    </View>
  );
}
