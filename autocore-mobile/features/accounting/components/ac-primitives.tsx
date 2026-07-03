import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { ac } from '../layout';

export function AcSectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Text
      variant="body"
      style={{
        fontSize: ac.sectionTitle,
        fontWeight: '700',
        letterSpacing: -0.2,
        marginBottom: 12,
        color: colors.foreground,
      }}
    >
      {title}
      {actionLabel ? (
        <Text
          variant="caption"
          style={{ fontWeight: '600', color: colors.primary }}
          onPress={onAction}
        >
          {'  '}
          {actionLabel}
        </Text>
      ) : null}
    </Text>
  );
}

export function AcDivider({ inset = 44 }: { inset?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: ac.hairline,
        backgroundColor: colors.border,
        marginLeft: inset,
      }}
    />
  );
}
