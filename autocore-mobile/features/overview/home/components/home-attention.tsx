import { memo, useCallback } from 'react';
import { View } from 'react-native';

import { AlertTriangleIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import type { HomeAttentionItem, HomeAttentionSeverity } from '../types';
import {
  home,
  HomeChevron,
  HomeDivider,
  HomeRow,
  HomeSection,
  HomeSurface,
} from './home-primitives';

const SEVERITY_WORD: Record<HomeAttentionSeverity, string> = {
  blocking: 'Blocked',
  warning: 'Needs action',
  informational: 'For information',
};

/**
 * One thing that needs a person.
 *
 * Only a genuinely blocked condition earns a mark; a warning is a plain row in
 * severity order. Colouring every row would leave nothing for the case that
 * actually stops work, and a screen where everything is urgent is a screen
 * nobody reads. The severity word travels in the accessibility label, so the
 * distinction is never carried by colour alone.
 */
const AttentionRow = memo(function AttentionRow({
  item,
  onPress,
}: {
  item: HomeAttentionItem;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const blocking = item.severity === 'blocking';

  return (
    <HomeRow
      accessibilityLabel={`${SEVERITY_WORD[item.severity]}. ${item.title}. ${item.explanation}`}
      accessibilityHint={item.action}
      onPress={onPress}
      style={{ paddingHorizontal: home.rowPadX, paddingVertical: home.rowPadY }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.stack }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.micro + 2 }}>
            {blocking ? (
              <AlertTriangleIcon size={15} color={colors.destructive} strokeWidth={2} />
            ) : null}
            <Text
              variant="callout"
              numberOfLines={2}
              style={{
                fontWeight: '500',
                flexShrink: 1,
                color: blocking ? colors.destructive : colors.foreground,
              }}
            >
              {item.title}
            </Text>
          </View>
          <Text variant="footnote" color="muted" numberOfLines={2}>
            {item.explanation}
          </Text>
        </View>
        <HomeChevron />
      </View>
    </HomeRow>
  );
});

export const HomeAttention = memo(function HomeAttention({
  items,
  onOpen,
}: {
  items: HomeAttentionItem[];
  onOpen: (item: HomeAttentionItem) => void;
}) {
  const handleOpen = useCallback((item: HomeAttentionItem) => () => onOpen(item), [onOpen]);

  // Progressive disclosure: nothing wrong means no section at all.
  if (items.length === 0) return null;

  return (
    <HomeSection title="Needs attention">
      <HomeSurface>
        {items.map((item, index) => (
          <View key={item.id}>
            {index > 0 ? <HomeDivider /> : null}
            <AttentionRow item={item} onPress={handleOpen(item)} />
          </View>
        ))}
      </HomeSurface>
    </HomeSection>
  );
});
