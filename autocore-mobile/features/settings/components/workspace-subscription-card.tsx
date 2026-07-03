import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ReceiptIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { subscriptionHint, subscriptionPlanLabel } from '@/lib/billing/format-renewal';
import type { CompanySubscription } from '@/types/billing';
import { useProfileEnter } from '@/features/profile/animation/use-profile-enter';

import { settingsLayout } from '../layout';

type WorkspaceSubscriptionCardProps = {
  isPro: boolean;
  subscription: CompanySubscription | null;
  onManage: () => void;
};

export function WorkspaceSubscriptionCard({ isPro, subscription, onManage }: WorkspaceSubscriptionCardProps) {
  const { colors } = useTheme();
  const enterStyle = useProfileEnter({ delay: 90, translateY: 10, duration: 320 });

  return (
    <Animated.View
      style={[
        {
          borderRadius: settingsLayout.cardRadius,
          borderWidth: settingsLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 18,
          gap: 14,
        },
        enterStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <ReceiptIcon size="sm" color={colors.primary} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="body" style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.15 }}>
            Подписка
          </Text>
          <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>
            {subscriptionHint(subscription, isPro)}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: isPro ? colors.primary : colors.muted,
          }}
        >
          <Text
            variant="caption"
            style={{ fontWeight: '700', color: isPro ? colors.primaryForeground : colors.foreground }}
          >
            {subscriptionPlanLabel(isPro)}
          </Text>
        </View>
      </View>

      <Button variant="secondary" onPress={onManage}>
        Управление подпиской
      </Button>
    </Animated.View>
  );
}
