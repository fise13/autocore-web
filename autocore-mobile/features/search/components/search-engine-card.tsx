import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CarIcon } from '@/assets/icons';
import { Badge, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { usePressAnimation } from '@/animations';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { formatPrice, formatVin } from '../lib/format';
import { statusLabel, statusVariant } from '../lib/status';
import { searchLayout } from '../layout';
import type { SearchEngine, SearchResultItem } from '../types';

type SearchEngineCardProps = {
  engine: SearchEngine | SearchResultItem;
  compact?: boolean;
  onPress?: () => void;
};

function isEngine(entity: SearchEngine | SearchResultItem): entity is SearchEngine {
  return 'code' in entity && 'vehicle' in entity;
}

export function SearchEngineCard({ engine, compact = false, onPress }: SearchEngineCardProps) {
  const { colors } = useTheme();
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation(0.98);
  const code = isEngine(engine) ? engine.code : engine.title;
  const vehicle = isEngine(engine) ? engine.vehicle : engine.subtitle ?? '';
  const status = engine.status ?? 'in_stock';
  const shelf = engine.shelf;
  const price = engine.price;
  const vin = engine.vin;

  const content = (
    <View
      style={{
        borderRadius: searchLayout.cardRadius,
        borderWidth: searchLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: compact ? 12 : 14,
        minHeight: compact ? 96 : searchLayout.engineCardHeight,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text variant="body" style={{ fontSize: compact ? 15 : 16, fontWeight: '700', letterSpacing: -0.2 }}>
              {code}
            </Text>
            <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
          </View>
          <Text variant="caption" color="muted" style={{ fontSize: searchLayout.meta, lineHeight: 16 }}>
            {vehicle}
          </Text>
        </View>
        <View
          style={{
            width: compact ? 38 : searchLayout.engineThumb,
            height: compact ? 38 : searchLayout.engineThumb,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.mutedForeground, 0.08),
            borderWidth: searchLayout.hairline,
            borderColor: colors.border,
          }}
        >
          <CarIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {shelf ? (
          <Text variant="caption" color="muted" style={{ fontSize: searchLayout.meta }}>
            Полка {shelf}
          </Text>
        ) : null}
        {price ? (
          <Text variant="body" style={{ fontSize: compact ? 13 : 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatPrice(price)}
          </Text>
        ) : null}
      </View>

      {vin ? (
        <Text variant="caption" color="muted" style={{ fontSize: 10, fontVariant: ['tabular-nums'] }}>
          VIN {formatVin(vin)}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.light();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}
