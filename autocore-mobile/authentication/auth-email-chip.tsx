import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { form, rhythm } from '@/theme';

type AuthEmailChipProps = {
  email: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

export function AuthEmailChip({
  email,
  actionLabel = 'Change',
  onAction,
  actionDisabled = false,
}: AuthEmailChipProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: rhythm.radius,
        borderWidth: form.controlBorderWidth,
        borderColor: colors.border,
        backgroundColor: `${colors.muted}4D`,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Text variant="caption" color="muted">
        Email:
      </Text>
      <Text variant="body" style={{ fontSize: 14, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
        {email}
      </Text>
      {onAction ? (
        <Pressable disabled={actionDisabled} onPress={onAction} hitSlop={8}>
          <Text variant="caption" style={{ color: colors.primary, textDecorationLine: 'underline' }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
