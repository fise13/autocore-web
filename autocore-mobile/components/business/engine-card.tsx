import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CarIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { usePressAnimation } from '@/animations';
import { haptics } from '@/theme';
import { BusinessCardShell } from './business-card-shell';

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
  available: 'В наличии',
  reserved: 'Резерв',
  sold: 'Продан',
  dismantling: 'В разборе',
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
  const dl = useDesignLanguage();
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation();
  const tone = dl.tones[statusTone[status]];

  const content = (
    <BusinessCardShell
      title={title}
      subtitle={code}
      elevated
      headerRight={
        <View style={[dl.styles.createIconBadgeStyle({ scheme: dl.scheme, colors: dl.colors }, statusTone[status])]}>
          <CarIcon size="sm" color={tone.fg} />
        </View>
      }
      footer={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: dl.layout.inlineGap, alignItems: 'center' }}>
          <View style={{ paddingHorizontal: dl.layout.inlineGap, paddingVertical: dl.layout.inlineGap / 2, borderRadius: dl.corner.chip, backgroundColor: tone.bg, borderWidth: 1, borderColor: tone.border }}>
            <Text variant="caption" style={{ color: tone.fg }}>{statusLabel[status]}</Text>
          </View>
          {vin ? <Text variant="caption" color="muted">VIN {vin}</Text> : null}
          {mileage ? <Text variant="caption" color="muted">{mileage}</Text> : null}
          {price ? <Text variant="heading" style={{ marginLeft: 'auto' }}>{price}</Text> : null}
        </View>
      }
    />
  );

  if (!onPress) return content;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={() => { haptics.light(); onPress(); }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    </Animated.View>
  );
});
