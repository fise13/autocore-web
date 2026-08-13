import { memo, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

import { CarIcon } from '@/assets/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';
import { withAlpha } from '@/theme/color-utils';

export const ENGINE_THUMB_SIZE = 56;

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
}: {
  url: string | null;
  size?: number;
}) {
  const { colors, isDark } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const radius = Math.round(size * 0.26);
  const showPlaceholder = !url || failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        // `colors.muted` is the card colour in dark, so an empty slot would
        // vanish into the row. Lift it a step and outline it instead.
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
            style={{ width: size, height: size }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={140}
            // Decorative: the row's Pressable already carries the accessible name.
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
