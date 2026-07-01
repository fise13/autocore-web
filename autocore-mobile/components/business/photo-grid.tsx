import { memo } from 'react';
import { Image, View } from 'react-native';

import { ImagesIcon } from '@/assets/icons';
import { useDesignLanguage } from '@/hooks';
import { useAdaptiveLayout } from '@/hooks';

export type PhotoGridProps = {
  uris: string[];
  columns?: number;
  gap?: number;
  aspectRatio?: number;
};

export const PhotoGrid = memo(function PhotoGrid({
  uris,
  columns: columnsProp,
  gap,
  aspectRatio = 1,
}: PhotoGridProps) {
  const dl = useDesignLanguage();
  const { columns: adaptiveColumns, gridGap, contentWidth } = useAdaptiveLayout();
  const cols = columnsProp ?? Math.min(adaptiveColumns, 3);
  const spacing = gap ?? gridGap;
  const itemWidth = (contentWidth - spacing * (cols - 1)) / cols;

  if (!uris.length) {
    return (
      <View
        style={{
          height: itemWidth,
          borderRadius: dl.corner.card,
          backgroundColor: dl.colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ImagesIcon size="lg" color={dl.colors.mutedForeground} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing }}>
      {uris.map((uri) => (
        <Image
          key={uri}
          source={{ uri }}
          style={{
            width: itemWidth,
            height: itemWidth / aspectRatio,
            borderRadius: dl.corner.control,
            backgroundColor: dl.colors.muted,
          }}
          resizeMode="cover"
        />
      ))}
    </View>
  );
});
