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
  /** Off by default — the brand mark belongs on launch/login, not on every tab. */
  logo?: ImageSourcePropType | null;
  trailing?: ReactNode;
  /** Light text for dark camera chrome */
  inverted?: boolean;
  /** Start-aligned large title (default) or centred, for camera chrome. */
  align?: 'center' | 'start';
  /** Content between title and subtitle (e.g. balance) */
  belowTitle?: ReactNode;
  /** Pin over content (camera chrome) */
  overlay?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

/**
 * Tab / list page header.
 *
 * Left-aligned large title by default: it reads as the start of the content
 * rather than a banner above it, and it keeps roughly a third of the first
 * screen for actual content. Centred + logo remains available for camera
 * chrome, where the title is an overlay rather than a heading.
 */
export function PageHeader({
  title,
  subtitle,
  logo = null,
  trailing,
  inverted = false,
  align = 'start',
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
      {trailing && isCenter ? (
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

      <View
        style={{
          flexDirection: isCenter ? 'column' : 'row',
          alignItems: isCenter ? 'center' : 'flex-start',
          gap: isCenter ? rhythm.tight : rhythm.stack,
        }}
      >
      <View style={{ flex: isCenter ? undefined : 1, alignItems: isCenter ? 'center' : 'flex-start', gap: rhythm.tight }}>
        {logo ? (
          <Image
            source={logo}
            style={{ width: rhythm.logo, height: rhythm.logo, tintColor: titleColor }}
            contentFit="contain"
            cachePolicy="memory-disk"
            accessibilityLabel="AutoCore"
          />
        ) : null}
        <Text
          variant={isCenter ? 'pageTitle' : 'displayTitle'}
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
                ...(isCenter ? null : { fontSize: 15, lineHeight: 21 }),
              },
              subtitleStyle,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing && !isCenter ? <View style={{ paddingTop: rhythm.micro }}>{trailing}</View> : null}
      </View>
    </View>
  );
}
