import { Pressable, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { Badge, Text } from '@/components/ui';
import { usePressAnimation } from '@/animations';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { searchTimeline, useSearchEnter } from '../animation';
import { formatPrice } from '../lib/format';
import { iconForSearchKind } from '../lib/result-icons';
import { kindVisual } from '../lib/kind-visual';
import { statusLabel, statusVariant } from '../lib/status';
import { searchLayout } from '../layout';
import type { SearchResultItem } from '../types';
import { HighlightedText } from './highlighted-text';

type SearchResultRowProps = {
  item: SearchResultItem;
  query: string;
  index?: number;
  onPress: () => void;
};

function showStatusBadge(item: SearchResultItem): boolean {
  return (
    (item.kind === 'part' || item.kind === 'motor') &&
    Boolean(item.status) &&
    item.status !== 'in_stock'
  );
}

function resolveIconColor(
  colors: ReturnType<typeof useTheme>['colors'],
  tone: ReturnType<typeof kindVisual>['iconColor'],
): string {
  if (tone === 'primary') return colors.primary;
  if (tone === 'foreground') return colors.foreground;
  return colors.mutedForeground;
}

export function SearchResultRow({ item, query, index = 0, onPress }: SearchResultRowProps) {
  const { colors } = useTheme();
  const Icon = iconForSearchKind(item.kind);
  const visual = kindVisual(item.kind);
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation();
  const rowStyle = useSearchEnter({
    delay: searchTimeline.results + Math.min(index, 10) * searchTimeline.resultRow,
    translateY: 5,
    duration: 260,
  });

  const metaLine = [item.subtitle, item.meta].filter(Boolean).join(' · ');
  const showPrice = typeof item.price === 'number' && item.price > 0;

  return (
    <Reanimated.View style={rowStyle}>
      <Reanimated.View style={pressStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={
            item.kind === 'order'
              ? 'Открыть наряд'
              : item.kind === 'client'
                ? 'Позвонить клиенту'
                : 'Показать действия'
          }
          onPress={() => {
            haptics.light();
            onPress();
          }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: rhythm.inline,
            paddingVertical: 14,
            paddingHorizontal: rhythm.cardPadX,
            minHeight: rhythm.rowMinHeight,
          }}
        >
          <View
            style={{
              width: searchLayout.iconWell,
              height: searchLayout.iconWell,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(colors.foreground, 0.05),
            }}
          >
            <Icon
              size="sm"
              color={resolveIconColor(colors, visual.iconColor)}
              strokeWidth={1.75}
            />
          </View>

          <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <HighlightedText
                text={item.title}
                query={query}
                variant="bodyStrong"
                numberOfLines={1}
                style={{ flexShrink: 1, letterSpacing: item.kind === 'part' ? -0.2 : 0, fontSize: 15 }}
              />
              {showStatusBadge(item) && item.status ? (
                <Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge>
              ) : null}
            </View>
            {metaLine ? (
              <HighlightedText
                text={metaLine}
                query={query}
                variant="meta"
                color="muted"
                numberOfLines={1}
                style={{ fontSize: 12 }}
              />
            ) : null}
            {item.shelf ? (
              <Text variant="meta" color="muted" numberOfLines={1}>
                Ячейка {item.shelf}
              </Text>
            ) : null}
          </View>

          {showPrice ? (
            <Text
              variant="bodyStrong"
              style={{
                fontVariant: ['tabular-nums'],
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {formatPrice(item.price!)}
            </Text>
          ) : null}
        </Pressable>
      </Reanimated.View>
    </Reanimated.View>
  );
}
