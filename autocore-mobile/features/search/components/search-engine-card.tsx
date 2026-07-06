import { Pressable, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { Badge, Text } from '@/components/ui';
import { usePressAnimation } from '@/animations';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { searchTimeline, useSearchEnter } from '../animation';
import { formatPrice, formatVin, inventoryCardSubtitle, normalizeInventoryCode } from '../lib/format';
import { statusLabel, statusVariant } from '../lib/status';
import { searchLayout } from '../layout';
import type { SearchEngine, SearchResultItem } from '../types';

type SearchEngineCardProps = {
  engine: SearchEngine | SearchResultItem;
  compact?: boolean;
  index?: number;
  onPress?: () => void;
};

function isEngine(entity: SearchEngine | SearchResultItem): entity is SearchEngine {
  return 'code' in entity && 'vehicle' in entity;
}

function hasShelfValue(shelf?: string): shelf is string {
  const trimmed = shelf?.trim();
  return Boolean(trimmed && trimmed !== '—' && trimmed !== '-');
}

export function SearchEngineCard({
  engine,
  compact = false,
  index = 0,
  onPress,
}: SearchEngineCardProps) {
  const { colors } = useTheme();
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation(0.98);
  const enterStyle = useSearchEnter({
    delay: searchTimeline.idleViewed + index * 40,
    translateY: 8,
    duration: 280,
  });

  const rawCode = isEngine(engine) ? engine.code : engine.title;
  const code = normalizeInventoryCode(rawCode);
  const rawVehicle = isEngine(engine) ? engine.vehicle : engine.subtitle ?? engine.meta ?? '';
  const subtitle = isEngine(engine)
    ? engine.vehicle.trim() || undefined
    : (inventoryCardSubtitle(code, rawVehicle) ?? rawVehicle.trim()) || undefined;
  const status = engine.status ?? 'in_stock';
  const shelf = engine.shelf;
  const price = engine.price;
  const vin = engine.vin;
  const showShelf = hasShelfValue(shelf);
  const showPrice = typeof price === 'number' && price > 0;

  const content = (
    <View
      style={{
        borderRadius: searchLayout.cardRadius,
        borderWidth: searchLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: 'hidden',
        minHeight: compact ? 92 : searchLayout.engineCardHeight,
      }}
    >
      <View style={{ padding: compact ? 14 : 16, gap: compact ? 8 : 10 }}>
        <Text
          variant="body"
          numberOfLines={1}
          style={{
            fontSize: compact ? 15 : 16,
            fontWeight: '700',
            letterSpacing: -0.3,
            fontVariant: ['tabular-nums'],
          }}
        >
          {code}
        </Text>

        {subtitle ? (
          <Text
            variant="caption"
            color="muted"
            numberOfLines={1}
            style={{ fontSize: searchLayout.meta, lineHeight: 16 }}
          >
            {subtitle}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
          {showShelf || showPrice ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                flexShrink: 1,
                justifyContent: 'flex-end',
              }}
            >
              {showShelf ? (
                <Text variant="caption" color="muted" numberOfLines={1} style={{ fontSize: searchLayout.meta }}>
                  {shelf}
                </Text>
              ) : null}
              {showPrice ? (
                <Text
                  variant="body"
                  numberOfLines={1}
                  style={{
                    fontSize: compact ? 13 : 14,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                    color: colors.foreground,
                  }}
                >
                  {formatPrice(price!)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {vin ? (
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              backgroundColor: toneBackground(colors.mutedForeground, 0.08),
            }}
          >
            <Text variant="caption" color="muted" style={{ fontSize: 10, fontVariant: ['tabular-nums'] }}>
              VIN {formatVin(vin)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return <Reanimated.View style={enterStyle}>{content}</Reanimated.View>;
  }

  return (
    <Reanimated.View style={[enterStyle, pressStyle]}>
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
    </Reanimated.View>
  );
}
