import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { AUTOCOMPLETE_ROW_HEIGHT } from '@/lib/autocomplete/constants';
import type { AutocompleteOption } from '@/lib/autocomplete/types';

type AutocompleteRowProps = {
  option: AutocompleteOption;
  highlighted: boolean;
  onPress: () => void;
};

export const AutocompleteRow = memo(function AutocompleteRow({
  option,
  highlighted,
  onPress,
}: AutocompleteRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: AUTOCOMPLETE_ROW_HEIGHT,
        maxHeight: 56,
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: highlighted || pressed ? colors.sidebarAccent : colors.card,
      })}
    >
      <Text variant="body" style={{ fontSize: 15, fontWeight: highlighted ? '600' : '500' }} numberOfLines={1}>
        {option.label ?? option.value}
      </Text>
      {option.label && option.label !== option.value ? (
        <Text variant="caption" color="muted" numberOfLines={1}>
          {option.value}
        </Text>
      ) : null}
    </Pressable>
  );
});

export function AutocompletePanel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        borderTopWidth: 1,
        borderColor: colors.borderMuted,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
