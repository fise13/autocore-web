import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks';
import { layout, radius, spacing, type ToneName } from '@/theme';
import type { IconProps } from '@/assets/icons';

import { Text } from './text';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'warning';

/** Legacy variant names map onto the tone scale so callers need no changes. */
const VARIANT_TONE: Record<Exclude<BadgeVariant, 'outline' | 'ghost'>, ToneName> = {
  default: 'primary',
  secondary: 'default',
  destructive: 'danger',
  success: 'success',
  warning: 'warning',
};

type BadgeProps = ViewProps & {
  variant?: BadgeVariant;
  /** `subtle` (default) tints the surface; `solid` fills it with the tone. */
  emphasis?: 'subtle' | 'solid';
  /** Leading 6pt dot — the category-chip pattern. */
  dot?: boolean;
  /** Leading glyph — the status-chip pattern. Ignored when `dot` is set. */
  icon?: React.ComponentType<IconProps>;
  children: React.ReactNode;
};

export function Badge({
  variant = 'default',
  emphasis = 'subtle',
  dot = false,
  icon: Icon,
  children,
  style,
  ...props
}: BadgeProps) {
  const { colors, tones } = useTheme();

  const chrome = (() => {
    if (variant === 'outline') {
      return { bg: 'transparent', fg: colors.foreground, border: colors.border };
    }
    if (variant === 'ghost') {
      return { bg: 'transparent', fg: colors.mutedForeground, border: 'transparent' };
    }
    const tone = tones[VARIANT_TONE[variant]];
    return emphasis === 'solid'
      ? { bg: tone.solid, fg: tone.onSolid, border: 'transparent' }
      : { bg: tone.bg, fg: tone.fg, border: tone.border };
  })();

  const hasLeading = dot || Boolean(Icon);

  return (
    <View
      style={[
        {
          minHeight: layout.badge.height,
          paddingVertical: spacing[0.5],
          paddingLeft: hasLeading ? spacing[1.5] : layout.badge.paddingHorizontal,
          paddingRight: layout.badge.paddingHorizontal,
          borderRadius: layout.badge.borderRadius,
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[1],
          backgroundColor: chrome.bg,
          borderWidth: 1,
          borderColor: chrome.border,
        },
        style,
      ]}
      {...props}
    >
      {dot ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: radius.full,
            backgroundColor: chrome.fg,
          }}
        />
      ) : Icon ? (
        <Icon size="xs" color={chrome.fg} />
      ) : null}

      <Text variant="caption" style={{ color: chrome.fg, fontWeight: '500' }}>
        {children}
      </Text>
    </View>
  );
}
