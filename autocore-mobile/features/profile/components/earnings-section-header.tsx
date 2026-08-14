import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

type EarningsSectionHeaderProps = {
  title: string;
  meta?: string;
};

export function EarningsSectionHeader({ title, meta }: EarningsSectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: tokens.space.stack,
        marginHorizontal: tokens.space.screenX + tokens.space.stack,
        marginBottom: tokens.space.inline,
      }}
    >
      <Text variant="sectionLabel" color="muted" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {meta ? (
        <Text variant="footnote" style={{ color: colors.mutedForeground }} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}
