import { Pressable, View } from 'react-native';

import { CheckIcon } from '@/assets/icons';
import { SettingsSectionCard, Text } from '@/components/ui';
import { themePreferenceLabel, useTheme, type ThemePreference } from '@/hooks/use-theme';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { ProfileSegmentedControl } from '@/features/profile/components/profile-animated-section';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { ACCENT_COLORS, useAppearanceSettingsStore } from '../store/appearance-settings-store';
import type { AccentColorId } from '../types';
import { SettingsToggleRow } from '../components/settings-toggle-row';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export function AppearanceSettingsScreen() {
  const { preference, setPreference, colors } = useTheme();
  const accentColor = useAppearanceSettingsStore((s) => s.accentColor);
  const animationsEnabled = useAppearanceSettingsStore((s) => s.animationsEnabled);
  const largeText = useAppearanceSettingsStore((s) => s.largeText);
  const setAccentColor = useAppearanceSettingsStore((s) => s.setAccentColor);
  const setAnimationsEnabled = useAppearanceSettingsStore((s) => s.setAnimationsEnabled);
  const setLargeText = useAppearanceSettingsStore((s) => s.setLargeText);

  return (
    <ProfileScreenShell title="Theme" subtitle="Light, dark, and accent color">
      <SettingsSectionCard title="Theme" description="System theme follows your device settings">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <ProfileSegmentedControl
            value={preference}
            onChange={setPreference}
            options={THEME_OPTIONS.map((option) => ({
              value: option,
              label: themePreferenceLabel(option),
            }))}
          />
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Accent color">
        <View
          style={{
            paddingHorizontal: rhythm.cardPadX,
            paddingBottom: rhythm.cardPadX,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          {(Object.keys(ACCENT_COLORS) as AccentColorId[]).map((id) => {
            const active = accentColor === id;
            const swatch = ACCENT_COLORS[id];
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setAccentColor(id)}
                style={{
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 64,
                  minHeight: 44,
                  padding: 8,
                  borderRadius: rhythm.radius,
                  borderWidth: 1,
                  borderColor: active ? toneBackground(colors.primary, 0.35) : colors.border,
                  backgroundColor: active ? toneBackground(colors.primary, 0.08) : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: swatch.hex,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {active ? <CheckIcon size="xs" color="#fff" strokeWidth={3} /> : null}
                </View>
                <Text
                  variant="caption"
                  style={{
                    fontWeight: active ? '600' : '500',
                    color: active ? colors.primary : colors.mutedForeground,
                  }}
                >
                  {swatch.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Interface">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: 4 }}>
          <SettingsToggleRow
            label="Animations"
            subtitle="Motion and enter transitions"
            value={animationsEnabled}
            onValueChange={setAnimationsEnabled}
          />
          <SettingsToggleRow
            label="Large text"
            subtitle="Increase text size across the app"
            value={largeText}
            onValueChange={setLargeText}
          />
        </View>
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}
