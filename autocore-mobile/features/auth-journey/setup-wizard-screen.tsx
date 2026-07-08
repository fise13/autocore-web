import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, Switch, Text } from '@/components/ui';
import { AUTH_JOURNEY_STEP_LABELS } from '@/hooks/use-auth-journey-step';
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
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

const MODULE_KEYS = Object.keys(MODULE_LABELS) as CompanyModuleKey[];

export function SetupWizardScreen() {
  const { colors } = useTheme();
  const { profile, memberships, refreshProfile } = useAuth();
  const { uid } = useSession();
  const companyId = resolveSessionCompanyId(profile, memberships);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CompanyAppConfig>(() => defaultCompanyAppConfig());
  const [activePreset, setActivePreset] = useState<BusinessPresetId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledModulesCount = useMemo(
    () => Object.values(draft.modules).filter(Boolean).length,
    [draft.modules],
  );

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
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить настройки');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      stepLabel={AUTH_JOURNEY_STEP_LABELS['setup-wizard']}
      title="Настройка пространства"
      description="Выберите разделы и гарантию. Всё можно изменить позже в настройках."
    >
      <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
        Шаг {step} из 3
      </Text>

      {step === 1 ? (
        <View style={{ gap: rhythm.stack }}>
          <Text variant="bodyStrong">Шаблон бизнеса</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BUSINESS_PRESETS.map((preset) => {
              const active = activePreset === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  onPress={() => applyPreset(preset.id)}
                  style={{
                    flexGrow: 1,
                    minWidth: '30%',
                    padding: 12,
                    borderRadius: rhythm.cardRadius,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? toneBackground(colors.primary, 0.08) : colors.card,
                  }}
                >
                  <Text variant="bodyStrong" style={{ fontSize: 14 }}>
                    {preset.label}
                  </Text>
                  <Text variant="caption" color="muted">
                    {preset.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text variant="bodyStrong">Разделы меню</Text>
          {MODULE_KEYS.map((key) => (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingVertical: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body">{MODULE_LABELS[key].label}</Text>
                <Text variant="caption" color="muted">
                  {MODULE_LABELS[key].description}
                </Text>
              </View>
              <Switch
                value={draft.modules[key]}
                onValueChange={(value) => toggleModule(key, value)}
              />
            </View>
          ))}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: rhythm.stack }}>
          <Text variant="body" color="muted">
            Каталог запчастей можно настроить позже в веб-версии. Сейчас применим выбранный шаблон.
          </Text>
          <Text variant="caption" color="muted">
            Выбрано категорий: {draft.specificCategories.length}
          </Text>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: rhythm.inline }}>
          <Text variant="bodyStrong">Гарантия по умолчанию</Text>
          {WARRANTY_OPTIONS.map((option) => {
            const active = draft.defaultWarrantyTemplate === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                onPress={() =>
                  setDraft((current) => ({ ...current, defaultWarrantyTemplate: option.id }))
                }
                style={{
                  padding: 14,
                  borderRadius: rhythm.cardRadius,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? toneBackground(colors.primary, 0.08) : colors.card,
                }}
              >
                <Text variant="body">{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: rhythm.stack }}>
        {step > 1 ? (
          <Button variant="ghost" onPress={() => setStep((current) => current - 1)} disabled={busy}>
            Назад
          </Button>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {step < 3 ? (
          <Button
            style={{ flex: 1 }}
            onPress={() => setStep((current) => current + 1)}
            disabled={step === 1 && enabledModulesCount === 0}
          >
            Далее
          </Button>
        ) : (
          <Button style={{ flex: 1 }} onPress={() => void finish()} loading={busy}>
            Готово
          </Button>
        )}
      </View>
    </AuthShell>
  );
}
