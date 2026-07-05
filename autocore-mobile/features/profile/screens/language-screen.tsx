import { Pressable, StyleSheet, View } from 'react-native';

import { CheckIcon } from '@/assets/icons';
import { SettingsSectionCard, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { rhythm } from '@/theme';

import { ProfileScreenShell } from '../components/profile-screen-shell';

const LANGUAGES = [{ id: 'ru', label: 'Русский' }] as const;

export function LanguageScreen() {
  const { colors } = useTheme();

  return (
    <ProfileScreenShell title="Язык" subtitle="Язык интерфейса">
      <SettingsSectionCard>
        <View style={styles.hint}>
          <Text variant="caption" color="muted" style={styles.hintText}>
            Приложение локализовано на русский язык.
          </Text>
        </View>
        {LANGUAGES.map((language) => (
          <Pressable
            key={language.id}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.row,
                  {
                    borderTopColor: colors.border,
                    backgroundColor: pressed ? colors.muted : 'transparent',
                  },
                ]}
              >
                <Text
                  variant="body"
                  style={{ fontSize: 15, fontWeight: '500', color: colors.foreground }}
                >
                  {language.label}
                </Text>
                <View style={[styles.check, { backgroundColor: colors.primary }]}>
                  <CheckIcon size={12} color={colors.primaryForeground} strokeWidth={2.5} />
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    paddingHorizontal: rhythm.cardPadX,
    paddingTop: 12,
    paddingBottom: 8,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 17,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rhythm.cardPadX,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
