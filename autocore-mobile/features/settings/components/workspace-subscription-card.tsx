import { View } from 'react-native';

import { Button, SettingsSectionCard, Text } from '@/components/ui';
import { planLabel, subscriptionHint } from '@/lib/subscriptions/format';
import type { Entitlement } from '@/lib/subscriptions/types';
import { rhythm } from '@/theme';

type WorkspaceSubscriptionCardProps = {
  entitlement: Entitlement;
  onManage: () => void;
};

/**
 * The "Manage on website" button is gone: on iOS that was an external purchase
 * link (guideline 3.1.1), and everywhere else the in-app subscription screen now
 * does the same job.
 */
export function WorkspaceSubscriptionCard({
  entitlement,
  onManage,
}: WorkspaceSubscriptionCardProps) {
  return (
    <SettingsSectionCard title="Subscription" description={subscriptionHint(entitlement)}>
      <View
        style={{
          paddingHorizontal: rhythm.cardPadX,
          paddingBottom: rhythm.cardPadX,
          gap: rhythm.stack,
        }}
      >
        <Text variant="caption" color="muted">
          Plan: {planLabel(entitlement)}
        </Text>
        <Button variant="secondary" onPress={onManage}>
          {entitlement.isActive ? 'Manage subscription' : 'View plans'}
        </Button>
      </View>
    </SettingsSectionCard>
  );
}
