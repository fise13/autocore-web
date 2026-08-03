import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { wo, woType } from '../theme/wo-visual';

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
    <View style={{ gap: wo.stackGap }}>
      <Text variant="body" style={{ fontWeight: '600' }}>
        WO #{orderNumber} needs a technician
      </Text>
      <Text variant="caption" color="muted" style={woType.meta}>
        {unassignedCount === 1
          ? 'Unassigned — claim it to put it on your board.'
          : `${unassignedCount} unassigned labor lines. Claim to start.`}
      </Text>
      <Button
        native={false}
        onPress={onClaim}
        loading={claiming}
        disabled={claiming || Boolean(blockedReason)}
      >
        Claim work order
      </Button>
      {blockedReason ? (
        <Text variant="caption" color="destructive">
          {blockedReason}
        </Text>
      ) : null}
    </View>
  );
}
