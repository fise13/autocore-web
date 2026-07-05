import { Image } from 'react-native';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { usePageEnter, useScaleEnter } from '@/animations';
import { useTheme } from '@/hooks';
import { form, rhythm, spacing } from '@/theme';

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function AuthMark() {
  return (
    <Image
      source={require('../assets/branding/login-logo.png')}
      style={{ width: rhythm.logo, height: rhythm.logo }}
      resizeMode="contain"
    />
  );
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  const { colors } = useTheme();
  const headerStyle = usePageEnter();
  const contentStyle = useScaleEnter(80);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: rhythm.pad,
            paddingVertical: spacing[4],
          }}
        >
          <View style={{ flex: 1, justifyContent: 'center', gap: form.sectionGap, maxWidth: 420, width: '100%', alignSelf: 'center' }}>
            <Animated.View style={headerStyle.style}>
              <View style={{ alignItems: 'center', gap: rhythm.inline, paddingHorizontal: spacing[1] }}>
                <AuthMark />
                <View style={{ gap: rhythm.micro, alignItems: 'center' }}>
                  <Text
                    variant="pageTitle"
                    style={{ textAlign: 'center', color: colors.foreground, maxWidth: 320 }}
                  >
                    {title}
                  </Text>
                  {description ? (
                    <Text
                      variant="pageSubtitle"
                      style={{ textAlign: 'center', maxWidth: 280, color: colors.mutedForeground }}
                    >
                      {description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[contentStyle, { width: '100%', gap: form.groupGap }]}>{children}</Animated.View>

            {footer ? (
              <View style={{ alignItems: 'center', gap: rhythm.tight, paddingHorizontal: spacing[2] }}>{footer}</View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
