import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { usePressAnimation } from '@/animations';
import { fontFamily, haptics, tokens } from '@/theme';

export type EngineCardProps = {
  title: string;
  code?: string;
  vin?: string;
  status?: 'available' | 'reserved' | 'sold' | 'dismantling';
  mileage?: string;
  price?: string;
  onPress?: () => void;
};

const statusTone: Record<NonNullable<EngineCardProps['status']>, 'success' | 'warning' | 'danger' | 'primary' | 'muted'> = {
  available: 'success',
  reserved: 'warning',
  sold: 'muted',
  dismantling: 'primary',
};

const statusLabel: Record<NonNullable<EngineCardProps['status']>, string> = {
  available: 'In stock',
  reserved: 'Reserved',
  sold: 'Sold',
  dismantling: 'Dismantling',
};

export const EngineCard = memo(function EngineCard({
  title,
  code,
  vin,
  status = 'available',
  mileage,
  price,
  onPress,
}: EngineCardProps) {
  const { colors, tones } = useTheme();
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation(0.98);
  const chrome = tones[statusTone[status]];

  const content = (
    <View
      style={{
        borderRadius: tokens.radius.group,
        borderWidth: tokens.control.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 20,
        gap: 10,
      }}
    >
      <View style={{ gap: 4 }}>
        {code ? (
          <Text variant="caption1" color="muted" numberOfLines={1} style={{ letterSpacing: 0.3 }}>
            {code}
          </Text>
        ) : null}
        <Text
          variant="headline"
          numberOfLines={1}
          style={{ color: colors.foreground, letterSpacing: -0.3 }}
        >
          {title}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <View
          style={{
            minHeight: 22,
            paddingHorizontal: 8,
            borderRadius: 9999,
            backgroundColor: chrome.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            variant="caption2"
            style={{
              color: chrome.fg,
              fontWeight: '600',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            {statusLabel[status]}
          </Text>
        </View>
        {vin ? (
          <Text variant="caption1" color="muted" style={{ fontFamily: fontFamily.mono }}>
            VIN {vin}
          </Text>
        ) : null}
        {mileage ? (
          <Text variant="caption1" color="muted">
            {mileage}
          </Text>
        ) : null}
        {price ? (
          <Text variant="headline" style={{ marginLeft: 'auto', fontVariant: ['tabular-nums'] }}>
            {price}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
});
