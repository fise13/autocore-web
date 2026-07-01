import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';

export type TimelineCardProps = {
  title: string;
  description?: string;
  time: string;
  isLast?: boolean;
};

/** Mirrors .mc-timeline-rail */
export const TimelineCard = memo(function TimelineCard({
  title,
  description,
  time,
  isLast = false,
}: TimelineCardProps) {
  const dl = useDesignLanguage();

  return (
    <View style={{ flexDirection: 'row', gap: dl.layout.stackGap }}>
      <View style={{ alignItems: 'center', width: 20 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dl.colors.primary,
            marginTop: dl.layout.inlineGap,
          }}
        />
        {!isLast ? (
          <View style={{ flex: 1, width: 1, backgroundColor: dl.colors.border, marginVertical: dl.layout.inlineGap / 2 }} />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: dl.layout.sectionGap, gap: dl.layout.inlineGap / 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: dl.layout.inlineGap }}>
          <Text variant="heading">{title}</Text>
          <Text variant="caption" color="muted">{time}</Text>
        </View>
        {description ? <Text variant="body" color="muted">{description}</Text> : null}
      </View>
    </View>
  );
});
