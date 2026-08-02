import { useState, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';

import { CheckIcon, CloudIcon, SparklesIcon } from '@/assets/icons';
import { Button, Text, toast } from '@/components/ui';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { activateProForever } from '@/services/api/subscriptions';
import {
  DEV_SCENARIOS,
  getDevState,
  isDevModeAvailable,
  setDevForceOffline,
  setDevScenario,
  subscribeDevMode,
  type DevScenarioId,
} from '@/lib/subscriptions/dev-mode';
import { devSimulatePurchase } from '@/lib/subscriptions/subscription-manager';
import { haptics, radius, rhythm, spacing } from '@/theme';

/**
 * Development control panel.
 *
 * The real flow needs a verification endpoint, App Store Connect products and a
 * sandbox Apple ID — none of which exist locally. This drives the whole system
 * without them: one button runs a full simulated purchase through the real
 * state machine, and the scenario chips jump straight to any subscription state
 * worth looking at.
 *
 * Returns `null` outside `__DEV__`, and `isDevModeAvailable()` is compiled
 * against `__DEV__`, so the whole subtree drops out of release builds.
 */
export function DevSubscriptionPanel() {
  const { colors, tones } = useTheme();
  const { companyId } = useSession();
  const [granting, setGranting] = useState(false);
  const devState = useSyncExternalStore(subscribeDevMode, getDevState, getDevState);

  if (!isDevModeAvailable()) return null;

  /**
   * Unlike the scenario chips, this writes the real subscription document, so
   * the workspace stays Pro on every device and in release builds — which is
   * what a review or QA login needs. The server refuses unless internal
   * activation is enabled for the caller.
   */
  const grantForever = async () => {
    if (!companyId || granting) return;
    setGranting(true);
    haptics.medium();
    try {
      await activateProForever(companyId);
      haptics.success();
      toast({
        title: 'Pro activated for this workspace',
        description: 'Written to Firestore — web and mobile both see it.',
        variant: 'success',
      });
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Could not activate Pro',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setGranting(false);
    }
  };

  const select = (id: DevScenarioId) => {
    haptics.selection();
    setDevScenario(id);
  };

  const simulate = () => {
    haptics.medium();
    void devSimulatePurchase('pro_monthly');
  };

  return (
    <View
      style={{
        borderRadius: rhythm.cardRadius,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: tones.warning.border,
        backgroundColor: tones.warning.bg,
        padding: rhythm.cardPadX,
        gap: spacing[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <SparklesIcon size="sm" color={tones.warning.fg} />
        <Text variant="body" style={{ fontWeight: '700', color: tones.warning.fg, flex: 1 }}>
          Development
        </Text>
        <Text variant="caption" style={{ color: tones.warning.fg, opacity: 0.8, fontSize: 11 }}>
          Not in release builds
        </Text>
      </View>

      <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
        Runs the real purchase state machine without StoreKit or the server.
      </Text>

      <Button size="lg" onPress={simulate}>
        Simulate purchase
      </Button>

      <Button
        size="lg"
        variant="secondary"
        loading={granting}
        disabled={!companyId || granting}
        onPress={() => void grantForever()}
      >
        Activate Pro forever (server)
      </Button>

      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
          Jump to state
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] }}>
          {DEV_SCENARIOS.map((scenario) => {
            const active = devState.scenario === scenario.id;
            return (
              <Pressable
                key={scenario.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${scenario.label}. ${scenario.description}`}
                onPress={() => select(scenario.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[1],
                  paddingHorizontal: spacing[2.5],
                  paddingVertical: spacing[1.5],
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                }}
              >
                {active ? (
                  <CheckIcon size="xs" color={colors.primaryForeground} strokeWidth={3} />
                ) : null}
                <Text
                  variant="caption"
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: active ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {scenario.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: devState.forceOffline }}
        accessibilityLabel="Simulate offline"
        onPress={() => {
          haptics.toggle();
          setDevForceOffline(!devState.forceOffline);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingVertical: spacing[1.5],
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: radius.sm,
            borderWidth: 1.5,
            borderColor: devState.forceOffline ? colors.primary : colors.border,
            backgroundColor: devState.forceOffline ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {devState.forceOffline ? (
            <CheckIcon size="xs" color={colors.primaryForeground} strokeWidth={3} />
          ) : null}
        </View>
        <CloudIcon size="xs" color={colors.mutedForeground} />
        <Text variant="caption" color="muted">
          Simulate offline
        </Text>
      </Pressable>
    </View>
  );
}
