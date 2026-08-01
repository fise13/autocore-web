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
      title="No transactions yet"
      description="Sales, expenses, and payments will show up here once you record your first financial activity in AutoCore."
      primaryAction={
        canEdit
          ? {
              label: 'Log expense',
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
