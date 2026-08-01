import type { ReactNode } from 'react';
import { View } from 'react-native';

import { LockIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useFeatureGate, type UseFeatureGateResult } from '@/hooks/use-feature-gate';
import { useTheme } from '@/hooks/use-theme';
import type { GatedFeature } from '@/lib/subscriptions/feature-gate';
import { radius, rhythm, spacing } from '@/theme';

type FeatureGateProps = {
  feature: GatedFeature;
  children: ReactNode;
  /** Rendered instead of the built-in locked card. */
  fallback?: ReactNode;
  /** Render nothing at all when denied (menu entries, tab items). */
  hideWhenLocked?: boolean;
};

/**
 * Declarative premium gate.
 *
 * Each denial reason gets its own presentation: an upgrade card, an
 * administrator note, or a module hint. One generic wall for all three is what
 * this replaces.
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  hideWhenLocked = false,
}: FeatureGateProps) {
  const gate = useFeatureGate(feature);

  if (gate.allowed) return <>{children}</>;
  if (hideWhenLocked) return null;
  if (fallback) return <>{fallback}</>;

  // The evaluated gate is passed down rather than re-derived — one check, one
  // answer, no chance of the card disagreeing with the wrapper.
  return <FeatureLockedCard gate={gate} />;
}

type FeatureLockedCardProps = {
  gate: UseFeatureGateResult;
};

export function FeatureLockedCard({ gate }: FeatureLockedCardProps) {
  const { colors, tones } = useTheme();
  const Icon = gate.rule.icon;

  if (gate.reason === 'permission_denied') {
    return (
      <View
        style={{
          gap: rhythm.stack,
          padding: rhythm.cardPadX,
          borderRadius: rhythm.cardRadius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <Text variant="body">{gate.rule.paywall.title}</Text>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          You do not have access to this. Ask a workspace administrator to grant it.
        </Text>
      </View>
    );
  }

  if (gate.reason === 'module_disabled') {
    return (
      <View
        style={{
          gap: rhythm.stack,
          padding: rhythm.cardPadX,
          borderRadius: rhythm.cardRadius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <Text variant="body">{gate.rule.paywall.title}</Text>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          This module is turned off for your workspace. Enable it in Settings → Modules.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        gap: rhythm.stack,
        padding: rhythm.cardPadX,
        borderRadius: rhythm.cardRadius,
        borderWidth: 1,
        borderColor: tones.primary.border,
        backgroundColor: tones.primary.bg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
          }}
        >
          <Icon size="sm" color={tones.primary.fg} />
        </View>
        <View style={{ flex: 1, gap: spacing[0.5] }}>
          <Text variant="body" style={{ color: tones.primary.fg, fontWeight: '600' }}>
            {gate.rule.paywall.title}
          </Text>
          <Text variant="caption" style={{ color: tones.primary.fg, opacity: 0.8 }}>
            Included in AutoCore Pro
          </Text>
        </View>
        <LockIcon size="sm" color={tones.primary.fg} />
      </View>

      <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
        {gate.rule.paywall.body}
      </Text>

      <Button size="sm" onPress={gate.presentPaywall}>
        View plans
      </Button>
    </View>
  );
}
