import { Pressable, View } from 'react-native';

import { CheckIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { themePreferenceLabel, useTheme, type ThemePreference } from '@/hooks/use-theme';

import { ProfileSegmentedControl } from '@/features/profile/components/profile-animated-section';
import { ProfileMetaCard } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { ACCENT_COLORS, useAppearanceSettingsStore } from '../store/appearance-settings-store';
import type { AccentColorId } from '../types';
import { SettingsToggleRow } from '../components/settings-toggle-row';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export function AppearanceSettingsScreen() {
  const { preference, setPreference, colors } = useTheme();
  const accentColor = useAppearanceSettingsStore((s) => s.accentColor);
  const animationsEnabled = useAppearanceSettingsStore((s) => s.animationsEnabled);
  const compactMode = useAppearanceSettingsStore((s) => s.compactMode);
  const largeText = useAppearanceSettingsStore((s) => s.largeText);
  const setAccentColor = useAppearanceSettingsStore((s) => s.setAccentColor);
  const setAnimationsEnabled = useAppearanceSettingsStore((s) => s.setAnimationsEnabled);
  const setCompactMode = useAppearanceSettingsStore((s) => s.setCompactMode);
  const setLargeText = useAppearanceSettingsStore((s) => s.setLargeText);

  return (
    <ProfileScreenShell title="Оформление" subtitle="Тема, акцент и плотность интерфейса">
      <ProfileMetaCard title="Тема" delay={60}>
        <ProfileSegmentedControl
          value={preference}
          onChange={setPreference}
          options={THEME_OPTIONS.map((option) => ({ value: option, label: themePreferenceLabel(option) }))}
          delay={80}
        />
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Системная тема подстраивается под настройки устройства.
        </Text>
      </ProfileMetaCard>

      <ProfileMetaCard title="Акцентный цвет" delay={100}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(Object.keys(ACCENT_COLORS) as AccentColorId[]).map((id) => {
            const active = accentColor === id;
            const swatch = ACCENT_COLORS[id];
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setAccentColor(id)}
                style={{ alignItems: 'center', gap: 6, minWidth: 72 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: swatch.hex,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: active ? 2 : 0,
                    borderColor: colors.foreground,
                  }}
                >
                  {active ? <CheckIcon size="xs" color="#fff" strokeWidth={3} /> : null}
                </View>
                <Text variant="caption" style={{ fontWeight: active ? '700' : '500' }}>
                  {swatch.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ProfileMetaCard>

      <ProfileMetaCard delay={140}>
        <SettingsToggleRow
          label="Анимации"
          subtitle="Плавные переходы и появление карточек"
          value={animationsEnabled}
          onValueChange={setAnimationsEnabled}
        />
        <SettingsToggleRow
          label="Компактный режим"
          subtitle="Меньше отступов и более плотные списки"
          value={compactMode}
          onValueChange={setCompactMode}
        />
        <SettingsToggleRow
          label="Крупный текст"
          subtitle="Увеличенные подписи для лучшей читаемости"
          value={largeText}
          onValueChange={setLargeText}
        />
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
