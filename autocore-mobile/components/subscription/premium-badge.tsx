import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { SparklesIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

type PremiumBadgeSize = 'sm' | 'md';

type PremiumBadgeProps = {
  size?: PremiumBadgeSize;
  /** Render even on the free tier (paywall headers, comparison tables). */
  alwaysShow?: boolean;
  label?: string;
};

const METRICS: Record<PremiumBadgeSize, { height: number; padX: number; font: number; icon: number }> = {
  sm: { height: 18, padX: spacing[1.5], font: 10, icon: 10 },
  md: { height: 22, padX: spacing[2], font: 11, icon: 12 },
};

/**
 * The Pro mark, used anywhere a surface needs to say "this workspace is paid".
 *
 * Self-gating: it reads the entitlement itself and renders nothing on the free
 * tier, so call sites do not each repeat an `isPro &&` check — that pattern is
 * how a stale badge survives a downgrade in one screen but not another.
 */
export function PremiumBadge({ size = 'sm', alwaysShow = false, label }: PremiumBadgeProps) {
  const { colors, isDark } = useTheme();
  const { entitlement } = useEntitlement();

  if (!alwaysShow && !entitlement.isActive) return null;

  const metrics = METRICS[size];
  const text = label ?? (entitlement.tier === 'enterprise' ? 'ENTERPRISE' : 'PRO');

  return (
    <LinearGradient
      colors={isDark ? [colors.primary, '#1f6fd4'] : [colors.primary, '#4d96ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        height: metrics.height,
        paddingHorizontal: metrics.padX,
        borderRadius: radius.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[1],
      }}
      accessibilityRole="text"
      accessibilityLabel={`${text} subscription`}
    >
      <SparklesIcon size="xs" color={colors.primaryForeground} strokeWidth={2.4} />
      <Text
        variant="caption"
        style={{
          color: colors.primaryForeground,
          fontSize: metrics.font,
          lineHeight: metrics.font + 3,
          fontWeight: '700',
          letterSpacing: 0.5,
        }}
      >
        {text}
      </Text>
    </LinearGradient>
  );
}

/** Neutral, non-gated variant for feature-comparison rows. */
export function PlanTag({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[0.5],
        borderRadius: radius.full,
        backgroundColor: colors.muted,
      }}
    >
      <Text variant="caption" color="muted" style={{ fontWeight: '600', fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}
