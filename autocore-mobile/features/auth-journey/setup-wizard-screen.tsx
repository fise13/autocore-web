import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, Switch, Text } from '@/components/ui';
import {
  AUTH_JOURNEY_STEP_LABELS,
  authJourneyProgressLabel,
} from '@/hooks/use-auth-journey-step';
import { useReducedMotion, useTheme } from '@/hooks';
import { useSession } from '@/hooks/use-session';
import {
  BUSINESS_PRESETS,
  categoriesForPreset,
  defaultCompanyAppConfig,
  MODULE_LABELS,
  modulesForPreset,
  WARRANTY_OPTIONS,
  type BusinessPresetId,
} from '@/lib/onboarding/defaults';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { saveCompanyAppConfig } from '@/services/firebase/company-config';
import type { CompanyAppConfig, CompanyModuleKey } from '@/types/company-config';
import { autocoreEase, duration, rhythm, spacing } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { JourneyOptionCard } from './journey-option-card';

function StaggerRow({ index, children }: { index: number; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.normal)
        .delay(Math.min(index, 8) * 40)
        .easing(autocoreEase);

  return <Animated.View entering={entering}>{children}</Animated.View>;
}

const MODULE_KEYS = Object.keys(MODULE_LABELS) as CompanyModuleKey[];
const SETUP_TOTAL = 3;

export function SetupWizardScreen() {
  const { colors } = useTheme();
  const { profile, memberships, refreshProfile } = useAuth();
  const { uid } = useSession();
  const companyId = resolveSessionCompanyId(profile, memberships);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [draft, setDraft] = useState<CompanyAppConfig>(() => ({
    ...defaultCompanyAppConfig(),
    modules: modulesForPreset('full'),
    specificCategories: categoriesForPreset('full'),
  }));
  const [activePreset, setActivePreset] = useState<BusinessPresetId | null>('full');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledModulesCount = useMemo(
    () => Object.values(draft.modules).filter(Boolean).length,
    [draft.modules],
  );

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError(null);
  };

  const applyPreset = (preset: BusinessPresetId) => {
    setActivePreset(preset);
    setDraft((current) => ({
      ...current,
      modules: modulesForPreset(preset),
      specificCategories: categoriesForPreset(preset),
    }));
  };

  const toggleModule = (key: CompanyModuleKey, enabled: boolean) => {
    setActivePreset(null);
    setDraft((current) => ({
      ...current,
      modules: { ...current.modules, [key]: enabled },
      ...(key === 'specifics' && !enabled ? { specificCategories: [] } : {}),
    }));
  };

  const finish = async () => {
    if (!companyId || !uid) return;
    setBusy(true);
    setError(null);
    try {
      await saveCompanyAppConfig(
        companyId,
        { ...draft, onboardingCompleted: true },
        uid,
      );
      await refreshProfile();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save settings');
    } finally {
      setBusy(false);
    }
  };

  const progressLabel = authJourneyProgressLabel('setup-wizard', {
    setupSubstep: step,
    setupTotal: SETUP_TOTAL,
  });

  if (step === 1) {
    return (
      <AuthShell
        stepLabel={AUTH_JOURNEY_STEP_LABELS['setup-wizard']}
        progressLabel={progressLabel}
        title="What kind of business?"
        description="Pick a starting template. You can change everything later in settings."
        stepKey="setup-preset"
        stepDirection={direction}
      >
        <View style={{ gap: spacing[3] }}>
          {BUSINESS_PRESETS.map((preset, index) => {
            const active = activePreset === preset.id;
            return (
              <JourneyOptionCard
                key={preset.id}
                index={index}
                selected={active}
                onPress={() => applyPreset(preset.id)}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  borderRadius: rhythm.cardRadius,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? toneBackground(colors.primary, 0.08) : colors.card,
                  gap: 4,
                }}
              >
                <Text variant="bodyStrong" style={{ fontSize: 17 }}>
                  {preset.label}
                </Text>
                <Text variant="caption" color="muted">
                  {preset.description}
                </Text>
              </JourneyOptionCard>
            );
          })}
        </View>

        <Button size="lg" onPress={() => goTo(2)} disabled={!activePreset && enabledModulesCount === 0}>
          Continue
        </Button>
      </AuthShell>
    );
  }

  if (step === 2) {
    return (
      <AuthShell
        stepLabel={AUTH_JOURNEY_STEP_LABELS['setup-wizard']}
        progressLabel={progressLabel}
        title="Which sections to show?"
        description="Turn on only what your team needs in the menu."
        onBack={() => goTo(1)}
        stepKey="setup-modules"
        stepDirection={direction}
      >
        <View style={{ gap: spacing[1] }}>
          {MODULE_KEYS.map((key, index) => (
            <StaggerRow key={key} index={index}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: toneBackground(colors.foreground, 0.06),
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    {MODULE_LABELS[key].label}
                  </Text>
                  <Text variant="caption" color="muted">
                    {MODULE_LABELS[key].description}
                  </Text>
                </View>
                <Switch
                  value={draft.modules[key]}
                  onValueChange={(value) => toggleModule(key, value)}
                />
              </View>
            </StaggerRow>
          ))}
        </View>

        {enabledModulesCount === 0 ? (
          <Text variant="caption" color="destructive">
            Pick at least one section to continue.
          </Text>
        ) : null}

        <Button size="lg" onPress={() => goTo(3)} disabled={enabledModulesCount === 0}>
          Continue
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      stepLabel={AUTH_JOURNEY_STEP_LABELS['setup-wizard']}
      progressLabel={progressLabel}
      title="Default warranty"
      description="Used when selling engines and units. You can override per deal."
      onBack={() => goTo(2)}
      stepKey="setup-warranty"
      stepDirection={direction}
    >
      <View style={{ gap: spacing[3] }}>
        {WARRANTY_OPTIONS.map((option, index) => {
          const active = draft.defaultWarrantyTemplate === option.id;
          return (
            <JourneyOptionCard
              key={option.id}
              index={index}
              selected={active}
              onPress={() =>
                setDraft((current) => ({ ...current, defaultWarrantyTemplate: option.id }))
              }
              style={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: rhythm.cardRadius,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? toneBackground(colors.primary, 0.08) : colors.card,
              }}
            >
              <Text variant="body" style={{ fontWeight: '600', fontSize: 16 }}>
                {option.label}
              </Text>
            </JourneyOptionCard>
          );
        })}
      </View>

      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : null}

      <Button size="lg" onPress={() => void finish()} loading={busy}>
        Finish setup
      </Button>
    </AuthShell>
  );
}
