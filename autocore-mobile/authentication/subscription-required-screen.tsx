import { Linking, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { getWebAppUrl, WEB_SUBSCRIPTION_PATH } from '@/lib/app-web-url';
import { rhythm } from '@/theme';

import { useAuth } from './auth-provider';

type SubscriptionRequiredScreenProps = {
  onRefresh?: () => void;
  refreshing?: boolean;
};

/**
 * Minimal subscription gate — no payment UI.
 * Billing is managed on the web app only.
 */
export function SubscriptionRequiredScreen({
  onRefresh,
  refreshing = false,
}: SubscriptionRequiredScreenProps) {
  const { colors } = useTheme();
  const { signOut } = useAuth();

  const openWebsite = () => {
    void Linking.openURL(getWebAppUrl(WEB_SUBSCRIPTION_PATH));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: rhythm.pad,
          justifyContent: 'center',
          alignItems: 'center',
          gap: rhythm.section,
        }}
      >
        <Image
          source={require('../assets/branding/login-logo.png')}
          style={{ width: rhythm.logo, height: rhythm.logo }}
          contentFit="contain"
          accessibilityLabel="AutoCore"
        />

        <View style={{ gap: rhythm.stack, alignItems: 'center', maxWidth: 320 }}>
          <Text
            variant="pageTitle"
            style={{
              textAlign: 'center',
              color: colors.foreground,
              fontSize: 22,
              lineHeight: 30,
            }}
          >
            Для продолжения необходима активная подписка.
          </Text>
          <Text
            variant="pageSubtitle"
            style={{
              textAlign: 'center',
              color: colors.mutedForeground,
              lineHeight: 20,
            }}
          >
            Управление подпиской доступно на сайте.
          </Text>
        </View>

        <View style={{ width: '100%', maxWidth: 320, gap: rhythm.inline }}>
          <Button onPress={openWebsite}>Открыть сайт</Button>
          {onRefresh ? (
            <Button variant="secondary" loading={refreshing} onPress={onRefresh}>
              Обновить статус
            </Button>
          ) : null}
          <Button variant="ghost" onPress={() => void signOut()}>
            Выйти
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
