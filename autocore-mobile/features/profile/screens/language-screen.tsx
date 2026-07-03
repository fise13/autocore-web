import { Pressable, View } from 'react-native';

import { CheckIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

import { ProfileMetaCard } from '../components/profile-meta-card';
import { ProfileScreenShell } from '../components/profile-screen-shell';
import { profileLayout } from '../layout';

const LANGUAGES = [{ id: 'ru', label: 'Русский' }] as const;

export function LanguageScreen() {
  const { colors } = useTheme();

  return (
    <ProfileScreenShell title="Язык" subtitle="Язык интерфейса приложения">
      <ProfileMetaCard delay={80}>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Сейчас приложение полностью локализовано на русский язык.
        </Text>
        {LANGUAGES.map((language) => (
          <Pressable
            key={language.id}
            accessibilityRole="button"
            style={{
              minHeight: profileLayout.rowMinHeight,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
            }}
          >
            <Text variant="body" style={{ fontWeight: '600' }}>
              {language.label}
            </Text>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary,
              }}
            >
              <CheckIcon size="xs" color={colors.primaryForeground} strokeWidth={2.5} />
            </View>
          </Pressable>
        ))}
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
