import { Text } from '@/components/ui';
import { themePreferenceLabel, useTheme, type ThemePreference } from '@/hooks/use-theme';

import { ProfileMetaCard } from '../components/profile-meta-card';
import { ProfileScreenShell } from '../components/profile-screen-shell';
import { ProfileSegmentedControl } from '../components/profile-animated-section';

const OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export function AppearanceScreen() {
  const { preference, setPreference } = useTheme();

  return (
    <ProfileScreenShell title="Оформление" subtitle="Светлая, тёмная или системная тема">
      <ProfileMetaCard delay={80}>
        <ProfileSegmentedControl
          value={preference}
          onChange={setPreference}
          options={OPTIONS.map((option) => ({ value: option, label: themePreferenceLabel(option) }))}
          delay={100}
        />
      </ProfileMetaCard>
      <ProfileMetaCard delay={140}>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Системная тема подстраивается под настройки устройства.
        </Text>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
