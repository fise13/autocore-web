import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { eng, engFontCap, engType } from '../layout';
import type { EngineVariant } from '../lib/engine-variants';
import { variantHeading, variantSubtitle } from '../lib/engine-variants';

/**
 * Chapter heading for a motor family. Sits on the canvas, not in a card:
 * brand as a quiet kicker, the engine code as the name of the file.
 */
export function EngineYardHeading({ variant }: { variant: EngineVariant }) {
  const { colors } = useTheme();
  const heading = variantHeading(variant);
  const meta = variantSubtitle(variant);

  return (
    <View
      style={{
        paddingHorizontal: eng.pad,
        paddingTop: eng.block,
        paddingBottom: eng.inline,
        gap: 3,
      }}
    >
      {heading.kicker ? (
        <Text
          variant="caption1"
          numberOfLines={1}
          maxFontSizeMultiplier={engFontCap.control}
          style={{
            ...engType.kicker,
            color: colors.mutedForeground,
            letterSpacing: 0.4,
          }}
        >
          {heading.kicker}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: eng.stack }}>
        <Text
          variant="title3"
          numberOfLines={1}
          maxFontSizeMultiplier={engFontCap.title}
          style={{
            ...engType.variant,
            flex: 1,
            color: colors.foreground,
            letterSpacing: -0.4,
            fontWeight: '600',
          }}
        >
          {heading.title}
        </Text>
        {meta ? (
          <Text variant="caption1" color="muted" numberOfLines={1} style={engType.count}>
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
