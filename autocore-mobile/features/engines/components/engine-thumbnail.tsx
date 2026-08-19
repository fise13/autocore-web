import { memo, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

import { ImagesIcon } from '@/assets/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

import { EngineGlyph } from './engine-glyph';
import { eng } from '../layout';

export const ENGINE_THUMB_SIZE = eng.thumb;

/**
 * Engine preview.
 *
 * Photos come off Storage over the network, so the slot is skeletoned until
 * the first frame decodes — the row height never moves. Engines with no photo
 * yet get a quiet glyph rather than a permanent shimmer, otherwise a catalog
 * that has never been photographed looks like it is loading forever.
 */
export const EngineThumbnail = memo(function EngineThumbnail({
  url,
  size = ENGINE_THUMB_SIZE,
  radius = eng.thumbRadius,
}: {
  url: string | null;
  size?: number;
  radius?: number;
}) {
  const { colors, isDark } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showPlaceholder = !url || failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: isDark ? colors.surfaceElevated : colors.muted,
        borderWidth: eng.rule,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showPlaceholder ? (
        <EngineGlyph
          sf="photo"
          fallback={ImagesIcon}
          size={Math.round(size * 0.32)}
          color={withAlpha(colors.mutedForeground, 0.55)}
          weight="regular"
        />
      ) : (
        <>
          <Image
            source={{ uri: url }}
            style={{ width: size, height: size }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={140}
            alt=""
            accessibilityIgnoresInvertColors
            onLoadEnd={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
          {loaded ? null : (
            <Skeleton
              width={size}
              height={size}
              style={{ position: 'absolute', top: 0, left: 0, borderRadius: radius }}
            />
          )}
        </>
      )}
    </View>
  );
});
