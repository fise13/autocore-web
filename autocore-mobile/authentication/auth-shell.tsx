import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { form, rhythm, spacing } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

type AuthShellProps = {
  stepLabel?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function AuthMark() {
  return (
    <Image
      source={require('../assets/branding/login-logo.png')}
      style={{ width: 28, height: 28 }}
      resizeMode="contain"
      accessibilityLabel="AutoCore"
    />
  );
}

function AuthBackdrop() {
  const { colors, isDark } = useTheme();

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 280,
          opacity: isDark ? 0.22 : 0.35,
          backgroundColor: toneBackground(colors.foreground, 0.04),
        }}
      />
      <LinearGradient
        colors={[
          toneBackground(colors.primary, isDark ? 0.08 : 0.1),
          'transparent',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
      />
    </View>
  );
}

/** Auth layout — mirrors web `AuthJourneyShell` content panel (left-aligned, sm width). */
export function AuthShell({ stepLabel, title, description, children, footer }: AuthShellProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <AuthBackdrop />
        <KeyboardAwareScrollView
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: rhythm.pad,
            paddingTop: spacing[6],
            paddingBottom: spacing[8],
          }}
        >
            <View
              style={{
                width: '100%',
                maxWidth: 384,
                alignSelf: 'center',
                gap: form.sectionGap,
              }}
            >
              <View style={{ gap: rhythm.stack }}>
                <AuthMark />
                {stepLabel ? (
                  <Text
                    variant="caption"
                    color="muted"
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {stepLabel}
                  </Text>
                ) : null}
                {title ? (
                  <View style={{ gap: rhythm.micro }}>
                    <Text
                      variant="pageTitle"
                      style={{
                        fontSize: 24,
                        fontWeight: '700',
                        letterSpacing: -0.4,
                        lineHeight: 30,
                        color: colors.foreground,
                      }}
                    >
                      {title}
                    </Text>
                    {description ? (
                      <Text variant="pageSubtitle" style={{ fontSize: 16, lineHeight: 22, color: colors.mutedForeground }}>
                        {description}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View style={{ gap: form.groupGap }}>{children}</View>

              {footer ? <View style={{ paddingTop: spacing[2] }}>{footer}</View> : null}
            </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}
