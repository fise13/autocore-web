import type { ReactNode } from 'react';
import { View, type ImageSourcePropType, type StyleProp, type TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

import { Text } from './text';

const defaultLogo = require('../../assets/branding/login-logo.png');

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Pass `null` to hide logo */
  logo?: ImageSourcePropType | null;
  trailing?: ReactNode;
  /** Light text for dark camera chrome */
  inverted?: boolean;
  /** Centered (tabs) or start-aligned (orders list) */
  align?: 'center' | 'start';
  /** Content between title and subtitle (e.g. balance) */
  belowTitle?: ReactNode;
  /** Pin over content (camera chrome) */
  overlay?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

/** Tab / list page header — static, web-like. */
export function PageHeader({
  title,
  subtitle,
  logo = defaultLogo,
  trailing,
  inverted = false,
  align = 'center',
  belowTitle,
  overlay = false,
  titleStyle,
  subtitleStyle,
}: PageHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const titleColor = inverted ? '#ffffff' : colors.foreground;
  const subtitleColor = inverted ? 'rgba(255,255,255,0.72)' : colors.mutedForeground;
  const isCenter = align === 'center';

  return (
    <View
      pointerEvents={overlay ? 'box-none' : 'auto'}
      style={{
        paddingTop: insets.top + rhythm.headerTop,
        paddingBottom: isCenter ? rhythm.headerBottom : rhythm.tight,
        paddingHorizontal: rhythm.pad,
        ...(overlay
          ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }
          : null),
      }}
    >
      {trailing ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + rhythm.headerTop,
            right: rhythm.pad,
            zIndex: 1,
          }}
        >
          {trailing}
        </View>
      ) : null}

      <View style={{ alignItems: isCenter ? 'center' : 'flex-start', gap: rhythm.tight }}>
        {logo ? (
          <Image
            source={logo}
            style={{ width: rhythm.logo, height: rhythm.logo }}
            contentFit="contain"
            cachePolicy="memory-disk"
            accessibilityLabel="AutoCore"
          />
        ) : null}
        <Text
          variant="pageTitle"
          style={[{ color: titleColor, textAlign: isCenter ? 'center' : 'left' }, titleStyle]}
        >
          {title}
        </Text>
        {belowTitle}
        {subtitle ? (
          <Text
            variant="pageSubtitle"
            style={[
              {
                color: subtitleColor,
                textAlign: isCenter ? 'center' : 'left',
                maxWidth: isCenter ? 300 : undefined,
              },
              subtitleStyle,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
