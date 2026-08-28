import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { GlassSheen } from '@/components/navigation/glass-sheen';
import { useTheme } from '@/hooks/use-theme';
import { autocompleteBorderCurve, autocompleteGlass } from '@/theme/autocomplete';

type AutocompleteGlassPlateProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Chip plate. Solid `secondary` fill so copy never sits on a hole.
 * BlurView + sheen on top — not GlassView (it crashes inside overlay / accessory).
 */
export const AutocompleteGlassPlate = memo(function AutocompleteGlassPlate({
  children,
  style,
}: AutocompleteGlassPlateProps) {
  const { colors, scheme, isDark } = useTheme();
  const glass = autocompleteGlass(colors, scheme);
  const curve = autocompleteBorderCurve
    ? { borderCurve: autocompleteBorderCurve, borderRadius: glass.radius }
    : { borderRadius: glass.radius };

  return (
    <View
      style={[
        curve,
        {
          overflow: 'hidden',
          backgroundColor: colors.secondary,
          borderWidth: glass.hairline,
          borderColor: glass.hairlineColor,
        },
        style,
      ]}
    >
      <BlurView
        pointerEvents="none"
        intensity={glass.blurIntensity}
        tint={glass.blurTint}
        style={StyleSheet.absoluteFill}
      />
      <GlassSheen isDark={isDark} radius={glass.radius} />
      {children}
    </View>
  );
});
