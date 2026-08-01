import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { layout, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

type DemoModeBannerProps = {
  message?: string;
};

/**
 * Persistent demo watermark — only show when product mode is explicitly demo.
 * Never use silent mock fill without this banner.
 */
export function DemoModeBanner({
  message = 'Demo data — not live company balances',
}: DemoModeBannerProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="text"
      style={{
        marginHorizontal: layout.screenPad,
        marginBottom: rhythm.stack,
        paddingHorizontal: rhythm.cardPadX,
        paddingVertical: rhythm.stack,
        borderRadius: layout.cardRadius,
        backgroundColor: toneBackground(colors.warning, 0.14),
        borderWidth: rhythm.hairline,
        borderColor: toneBackground(colors.warning, 0.35),
      }}
    >
      <Text
        variant="caption"
        style={{
          fontWeight: '600',
          color: colors.warningOnSubtle,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </View>
  );
}
