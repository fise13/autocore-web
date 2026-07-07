import { View } from 'react-native';

import { WrenchIcon } from '@/assets/icons';
import { Button, SettingsSectionCard, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

type OrderClaimSectionProps = {
  orderNumber: string;
  unassignedCount: number;
  claiming: boolean;
  blockedReason?: string;
  onClaim: () => void;
};

export function OrderClaimSection({
  orderNumber,
  unassignedCount,
  claiming,
  blockedReason,
  onClaim,
}: OrderClaimSectionProps) {
  const { colors } = useTheme();

  return (
    <SettingsSectionCard
      title="Кто возьмёт?"
      description={`Наряд №${orderNumber} ждёт мастера`}
      icon={WrenchIcon}
      tone="default"
    >
      <View style={{ gap: rhythm.stack }}>
        <Text variant="body" color="muted">
          {unassignedCount === 1
            ? 'Есть свободная работа — можете взять наряд в работу.'
            : `Свободных работ: ${unassignedCount}. Возьмите наряд, чтобы начать.`}
        </Text>
        <Button onPress={onClaim} loading={claiming} disabled={claiming || Boolean(blockedReason)}>
          Взять в работу
        </Button>
        {blockedReason ? (
          <Text variant="caption" color="destructive">
            {blockedReason}
          </Text>
        ) : null}
        <Text variant="caption" color="muted">
          После взятия наряд появится в ваших активных заказах.
        </Text>
      </View>
    </SettingsSectionCard>
  );
}
