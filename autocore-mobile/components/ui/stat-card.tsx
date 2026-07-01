import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { useCardLift } from '@/animations';
import { layout, radius, spacing } from '@/theme';
import type { IconProps } from '@/assets/icons';
import { Text } from './text';

type StatCardTone = 'default' | 'primary' | 'warning' | 'destructive' | 'success';

type StatCardProps = ViewProps & {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  icon?: React.ComponentType<IconProps>;
  tone?: StatCardTone;
  footer?: React.ReactNode;
};

const toneColors: Record<StatCardTone, { value: keyof ReturnType<typeof useTheme>['colors']; icon: string }> = {
  default: { value: 'textPrimary', icon: 'muted' },
  primary: { value: 'primary', icon: 'primary' },
  warning: { value: 'warning', icon: 'warning' },
  destructive: { value: 'destructive', icon: 'destructive' },
  success: { value: 'success', icon: 'success' },
};

export function StatCard({
  label,
  value,
  suffix,
  hint,
  icon: Icon,
  tone = 'default',
  footer,
  style,
  ...props
}: StatCardProps) {
  const { colors, ring, shadows } = useTheme();
  const { style: liftStyle, onPressIn, onPressOut } = useCardLift();
  const toneConfig = toneColors[tone];

  const valueColor = colors[toneConfig.value as keyof typeof colors] ?? colors.textPrimary;
  const iconBg = `${colors[toneConfig.icon as keyof typeof colors] ?? colors.muted}1A`;
  const iconColor = colors[toneConfig.icon as keyof typeof colors] ?? colors.mutedForeground;

  return (
    <Animated.View
      style={liftStyle}
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
    >
      <View
        style={[
          {
            padding: spacing[3.5],
            borderRadius: radius.xl,
            backgroundColor: colors.card,
            gap: spacing[2],
            ...ring,
            ...shadows.xs,
          },
          style,
        ]}
        {...props}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text variant="sectionLabel" color="muted">
            {label}
          </Text>
          {Icon ? (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.lg,
                backgroundColor: iconBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size="sm" color={iconColor as string} />
            </View>
          ) : null}
        </View>

        <Text variant="kpi" style={{ color: valueColor }}>
          {value}
          {suffix ? (
            <Text variant="title" style={{ color: valueColor, fontSize: 18 }}>
              {suffix}
            </Text>
          ) : null}
        </Text>

        {(hint || footer) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5], marginTop: 'auto' }}>
            {footer}
            {hint ? <Text variant="caption" color="muted">{hint}</Text> : null}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
