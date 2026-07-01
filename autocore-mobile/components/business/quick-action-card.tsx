import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { usePressAnimation } from '@/animations';
import { haptics } from '@/theme';
import type { IconProps } from '@/assets/icons';

export type QuickActionCardProps = {
  label: string;
  description?: string;
  icon: React.ComponentType<IconProps>;
  onPress: () => void;
};

/** Mirrors .mc-action-tile */
export const QuickActionCard = memo(function QuickActionCard({
  label,
  description,
  icon: Icon,
  onPress,
}: QuickActionCardProps) {
  const dl = useDesignLanguage();
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={() => { haptics.light(); onPress(); }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          dl.styles.createListRowStyle({ scheme: dl.scheme, colors: dl.colors }),
          { flexDirection: 'row', alignItems: 'center', gap: dl.layout.inlineGap },
        ]}
      >
        <View style={dl.styles.createIconBadgeStyle({ scheme: dl.scheme, colors: dl.colors }, 'primary')}>
          <Icon size="sm" color={dl.tones.primary.fg} />
        </View>
        <View style={{ flex: 1, gap: dl.layout.inlineGap / 4 }}>
          <Text variant="body">{label}</Text>
          {description ? <Text variant="caption" color="muted">{description}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});
