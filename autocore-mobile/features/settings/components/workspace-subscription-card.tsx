import { View } from 'react-native';

import { Button, SettingsSectionCard, Text } from '@/components/ui';
import { rhythm } from '@/theme';
import { subscriptionHint, subscriptionPlanLabel } from '@/lib/billing/format-renewal';
import type { CompanySubscription } from '@/types/billing';

type WorkspaceSubscriptionCardProps = {
  isPro: boolean;
  subscription: CompanySubscription | null;
  onManage: () => void;
};

export function WorkspaceSubscriptionCard({ isPro, subscription, onManage }: WorkspaceSubscriptionCardProps) {
  return (
    <SettingsSectionCard
      title="Подписка"
      description={subscriptionHint(subscription, isPro)}
    >
      <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
        <Text variant="caption" color="muted">
          План: {subscriptionPlanLabel(isPro)}
        </Text>
        <Button variant="secondary" onPress={onManage}>
          Управление на сайте
        </Button>
      </View>
    </SettingsSectionCard>
  );
}
