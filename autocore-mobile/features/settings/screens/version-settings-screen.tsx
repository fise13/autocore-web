import Constants from 'expo-constants';
import { Linking, View } from 'react-native';

import { SettingsLinkRow, SettingsSectionCard, Surface, Text } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useTheme } from '@/hooks';
import { getPlatformContacts } from '@/lib/platform/platform-contacts';
import { radius, rhythm } from '@/theme';
import { openPhone } from '@/utils/open-phone';

function BetaBadge() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}12`,
        borderWidth: 1,
        borderColor: `${colors.primary}2E`,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.primary,
        }}
      />
      <Text
        variant="caption"
        style={{
          fontWeight: '700',
          fontSize: 11,
          letterSpacing: 1.4,
          color: colors.primary,
        }}
      >
        BETA
      </Text>
    </View>
  );
}

export function VersionSettingsScreen() {
  const { colors } = useTheme();
  const contacts = getPlatformContacts();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '—';
  const name = Constants.expoConfig?.name ?? 'AutoCore';
  const platform = Constants.platform?.ios ? 'iOS' : 'Android';

  return (
    <ProfileScreenShell title="Версия" subtitle="Сборка и поддержка">
      <View style={{ gap: rhythm.section }}>
        <Surface inset padded>
          <View style={{ gap: rhythm.tight }}>
            <Text variant="meta" color="muted" style={{ fontWeight: '500' }}>
              {name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <Text variant="bodyStrong" style={{ fontSize: 28, letterSpacing: -0.6 }}>
                v{version}
              </Text>
              <BetaBadge />
            </View>
            <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
              Ранняя бета-версия. Функции и интерфейс могут меняться — пишите в поддержку, если что-то
              работает не так.
            </Text>
          </View>

          <View
            style={{
              marginTop: 4,
              paddingTop: rhythm.stack,
              borderTopWidth: rhythm.hairline,
              borderTopColor: colors.border,
              gap: 4,
            }}
          >
            <Text variant="caption" color="muted">
              Сборка {build} · {platform}
            </Text>
            <Text variant="caption" color="muted">
              {contacts.supportLine}
            </Text>
          </View>
        </Surface>

        <SettingsSectionCard
          title="Поддержка"
          description="Те же контакты, что на сайте myautocore.com"
        >
          <SettingsLinkRow
            title="Email"
            value={contacts.email}
            onPress={() => void Linking.openURL(contacts.mailtoHref)}
          />
          <SettingsLinkRow
            title="Телефон"
            value={contacts.formattedPhone}
            bordered
            onPress={() => void openPhone(contacts.phone)}
          />
        </SettingsSectionCard>
      </View>
    </ProfileScreenShell>
  );
}
