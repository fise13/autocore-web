import { ReceiptIcon } from '@/assets/icons';
import { EmptyState } from '@/components/ui';
import { haptics } from '@/theme';

type AcAccountingEmptyStateProps = {
  canEdit?: boolean;
  onAddExpense?: () => void;
};

export function AcAccountingEmptyState({ canEdit = false, onAddExpense }: AcAccountingEmptyStateProps) {
  return (
    <EmptyState
      icon={ReceiptIcon}
      title="Пока нет операций"
      description="Здесь появятся продажи, расходы и платежи после первых финансовых движений в AutoCore."
      primaryAction={
        canEdit
          ? {
              label: 'Записать расход',
              onPress: () => {
                haptics.light();
                onAddExpense?.();
              },
            }
          : undefined
      }
    />
  );
}
