import { Image } from 'react-native';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { usePageEnter, useScaleEnter } from '@/animations';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function AuthMark() {
  return (
    <Image
      source={require('../assets/branding/login-logo.png')}
      style={{ width: 38, height: 38 }}
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
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
          }}
        >
          <View style={{ flex: 1, justifyContent: 'center', gap: spacing[4] }}>
            <Animated.View style={headerStyle.style}>
              <View style={{ alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[1] }}>
                <AuthMark />
                <View style={{ gap: spacing[1], alignItems: 'center' }}>
                  <Text
                    variant="title"
                    style={{ textAlign: 'center', fontSize: 30, lineHeight: 34, fontWeight: '600' }}
                  >
                    {title}
                  </Text>
                  <Text
                    variant="small"
                    color="muted"
                    style={{ textAlign: 'center', maxWidth: 280, lineHeight: 18 }}
                  >
                    {description}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={contentStyle}>
              <View style={{ gap: spacing[3], width: '100%' }}>{children}</View>
            </Animated.View>

            <View style={{ alignItems: 'center', gap: spacing[1.5] }}>{footer}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
