import { View } from 'react-native';

import { PlusIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

import { ac } from '../layout';

type AcFinanceToolbarProps = {
  operationCount: number;
  canEdit: boolean;
  onNewOperation: () => void;
};

export function AcFinanceToolbar({ operationCount, canEdit, onNewOperation }: AcFinanceToolbarProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View
        style={{
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: toneBackground(colors.primary, 0.08),
        }}
      >
        <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground }}>
          {operationCount} операций
        </Text>
      </View>

      <Button
        size="sm"
        disabled={!canEdit}
        onPress={onNewOperation}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <PlusIcon size="sm" color={colors.primaryForeground} strokeWidth={2.2} />
        Новая операция
      </Button>
    </View>
  );
}
