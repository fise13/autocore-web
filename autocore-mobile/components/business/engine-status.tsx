import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';

export type EngineStatusType = 'available' | 'reserved' | 'sold' | 'dismantling' | 'incoming';

const labels: Record<EngineStatusType, string> = {
  available: 'В наличии',
  reserved: 'Резерв',
  sold: 'Продан',
  dismantling: 'В разборе',
  incoming: 'Ожидается',
};

const toneMap: Record<EngineStatusType, 'success' | 'warning' | 'muted' | 'primary' | 'default'> = {
  available: 'success',
  reserved: 'warning',
  sold: 'muted',
  dismantling: 'primary',
  incoming: 'default',
};

export type EngineStatusProps = {
  status: EngineStatusType;
  showDot?: boolean;
};

export const EngineStatus = memo(function EngineStatus({ status, showDot = true }: EngineStatusProps) {
  const dl = useDesignLanguage();
  const tone = dl.tones[toneMap[status]];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: dl.layout.inlineGap / 2,
        paddingHorizontal: dl.layout.inlineGap,
        paddingVertical: dl.layout.inlineGap / 2,
        borderRadius: dl.corner.chip,
        backgroundColor: tone.bg,
        borderWidth: 1,
        borderColor: tone.border,
        alignSelf: 'flex-start',
      }}
    >
      {showDot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.fg }} />
      ) : null}
      <Text variant="caption" style={{ color: tone.fg, fontWeight: '500' }}>
        {labels[status]}
      </Text>
    </View>
  );
});
