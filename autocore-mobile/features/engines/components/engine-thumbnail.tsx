import { memo, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

import { CarIcon } from '@/assets/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';
import { withAlpha } from '@/theme/color-utils';

import { eng } from '../layout';

export const ENGINE_THUMB_SIZE = eng.thumb;

/**
 * Engine preview — skeleton until decode; `recyclingKey` avoids FlashList reuse flashes.
 * Fits the whole capture in the tile rather than cropping the centre.
 */
export const EngineThumbnail = memo(function EngineThumbnail({
  url,
  size = ENGINE_THUMB_SIZE,
}: {
  url: string | null;
  size?: number;
}) {
  const { colors, isDark } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [url]);

  const radius = Math.round(size * 0.26);
  const showPlaceholder = !url || failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: isDark ? colors.surfaceElevated : withAlpha(colors.muted, 0.9),
        borderWidth: tokens.control.hairline,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showPlaceholder ? (
        <CarIcon size="lg" color={withAlpha(colors.mutedForeground, 0.6)} strokeWidth={1.5} />
      ) : (
        <>
          <Image
            source={{ uri: url }}
            recyclingKey={url}
            style={{ width: size, height: size }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
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
