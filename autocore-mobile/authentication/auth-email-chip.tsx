import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, radius } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

type AuthEmailChipProps = {
  email: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

/** Read-only email row — same pill language as the landing email field. */
export function AuthEmailChip({
  email,
  actionLabel = 'Change',
  onAction,
  actionDisabled = false,
}: AuthEmailChipProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : FadeIn.duration(duration.normal).easing(autocoreEase);

  return (
    <Animated.View
      entering={entering}
      style={{
        width: '100%',
        minHeight: 52,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: toneBackground(colors.foreground, isDark ? 0.06 : 0.035),
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Text
        variant="body"
        style={{ fontSize: 16, fontWeight: '500', flex: 1, flexShrink: 1 }}
        numberOfLines={1}
      >
        {email}
      </Text>
      {onAction ? (
        <Pressable
          disabled={actionDisabled}
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={{ opacity: actionDisabled ? 0.45 : 1 }}
        >
          <Text variant="body" style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
