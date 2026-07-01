import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';

export type PriceCardProps = {
  label: string;
  amount: string;
  currency?: string;
  hint?: string;
  tone?: 'default' | 'primary' | 'success' | 'danger';
};

export const PriceCard = memo(function PriceCard({
  label,
  amount,
  currency,
  hint,
  tone = 'default',
}: PriceCardProps) {
  const dl = useDesignLanguage();
  const toneKey = tone === 'default' ? 'muted' : tone === 'danger' ? 'danger' : tone;
  const toneColor = dl.tones[toneKey].fg;

  return (
    <View
      style={[
        dl.styles.createSurfaceCardStyle({ scheme: dl.scheme, colors: dl.colors }),
        { gap: dl.layout.inlineGap },
      ]}
    >
      <Text variant="sectionLabel" color="muted">{label}</Text>
      <Text variant="kpi" style={{ color: toneColor }}>
        {amount}
        {currency ? <Text variant="title" style={{ color: toneColor, fontSize: dl.scaledSize(18) }}> {currency}</Text> : null}
      </Text>
      {hint ? <Text variant="caption" color="muted">{hint}</Text> : null}
    </View>
  );
});
