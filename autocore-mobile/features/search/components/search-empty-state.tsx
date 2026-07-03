import { View } from 'react-native';

import { SearchIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { searchLayout } from '../layout';

const suggestions = ['VIN', 'OEM', 'QR', 'Артикулу', 'Названию двигателя'] as const;

export function SearchEmptyState() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        marginHorizontal: searchLayout.pad,
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 28,
        borderRadius: searchLayout.cardRadius,
        borderWidth: searchLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.secondary,
        }}
      >
        <SearchIcon size="md" color={colors.mutedForeground} strokeWidth={1.85} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text variant="body" style={{ fontSize: 16, fontWeight: '600' }}>
          Мы ничего не нашли.
        </Text>
        <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18 }}>
          Попробуйте поискать по:
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {suggestions.map((item) => (
          <View
            key={item}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: colors.secondary,
              borderWidth: searchLayout.hairline,
              borderColor: colors.border,
            }}
          >
            <Text variant="caption" style={{ fontSize: searchLayout.label, fontWeight: '500' }}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
