import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { useCardLift } from '@/animations';
import { radius, spacing } from '@/theme';
import { Text } from './text';

/** Mission control module card — mirrors .mc-module-card */
type DashboardCardProps = ViewProps & {
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
};

export function DashboardCard({
  title,
  description,
  headerAction,
  footer,
  children,
  style,
  ...props
}: DashboardCardProps) {
  const { colors, ring, shadows } = useTheme();
  const { style: liftStyle, onPressIn, onPressOut } = useCardLift();

  return (
    <Animated.View style={liftStyle} onTouchStart={onPressIn} onTouchEnd={onPressOut}>
      <View
        style={[
          {
            borderRadius: radius['2xl'],
            backgroundColor: colors.card,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            ...shadows.xs,
          },
          style,
        ]}
        {...props}
      >
        {(title || headerAction) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: colors.borderMuted,
              backgroundColor: `${colors.muted}48`,
            }}
          >
            <View style={{ flex: 1, gap: spacing[0.5] }}>
              {title ? <Text variant="heading">{title}</Text> : null}
              {description ? <Text variant="caption" color="muted">{description}</Text> : null}
            </View>
            {headerAction}
          </View>
        )}

        <View style={{ padding: spacing[4] }}>{children}</View>

        {footer ? (
          <View
            style={{
              padding: spacing[4],
              borderTopWidth: 1,
              borderTopColor: colors.borderMuted,
            }}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
