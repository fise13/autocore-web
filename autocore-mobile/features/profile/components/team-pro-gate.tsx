import { Linking, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useCompanySubscription, useSession } from '@/hooks';
import { getWebAppUrl, WEB_SUBSCRIPTION_PATH } from '@/lib/app-web-url';
import { subscriptionPlanLabel } from '@/lib/billing/format-renewal';

import { ProfileMetaCard } from './profile-meta-card';

type TeamProGateProps = {
  children: React.ReactNode;
};

export function TeamProGate({ children }: TeamProGateProps) {
  const { companyId } = useSession();
  const { isPro, isLoading } = useCompanySubscription(companyId);

  if (isLoading) {
    return (
      <ProfileMetaCard delay={80}>
        <Text variant="caption" color="muted">
          Проверяем подписку…
        </Text>
      </ProfileMetaCard>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <ProfileMetaCard title="Команда на Pro" delay={80}>
      <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
        Сотрудники, роли и коды приглашений доступны на тарифе {subscriptionPlanLabel(true)}. Управление
        подпиской — на сайте.
      </Text>
      <View style={{ gap: 8 }}>
        <Button onPress={() => void Linking.openURL(getWebAppUrl(WEB_SUBSCRIPTION_PATH))}>
          Открыть сайт
        </Button>
      </View>
    </ProfileMetaCard>
  );
}
