import type { WorkOrder } from '../types';

export type OrdersMailListProps = {
  orders: WorkOrder[];
  editing: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onComplete: (order: WorkOrder) => void;
  onEnterEdit: (order: WorkOrder) => void;
  canEdit?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  isEmpty: boolean;
  onCreateEmpty?: () => void;
};
