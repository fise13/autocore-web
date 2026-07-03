import type { OrderStatus } from '../types';

export type WorkflowStageId = 'received' | 'reserved' | 'waiting_parts' | 'ready';

export type WorkflowStage = {
  id: WorkflowStageId;
  label: string;
  done: boolean;
  current: boolean;
};

const STAGE_ORDER: WorkflowStageId[] = ['received', 'reserved', 'waiting_parts', 'ready'];

const STAGE_LABELS: Record<WorkflowStageId, string> = {
  received: 'Принят',
  reserved: 'Резерв',
  waiting_parts: 'Запчасти',
  ready: 'Готов',
};

function resolveStageIndex(status: OrderStatus): number {
  switch (status) {
    case 'completed':
    case 'warranty':
      return 3;
    case 'ready':
      return 3;
    case 'waiting_parts':
    case 'overdue':
      return 2;
    case 'in_progress':
      return 1;
    default:
      return 0;
  }
}

export function getWorkflowStages(status: OrderStatus): WorkflowStage[] {
  if (status === 'ready' || status === 'completed' || status === 'warranty') {
    return STAGE_ORDER.map((id) => ({
      id,
      label: STAGE_LABELS[id],
      done: true,
      current: false,
    }));
  }

  const currentIndex = resolveStageIndex(status);

  return STAGE_ORDER.map((id, index) => ({
    id,
    label: STAGE_LABELS[id],
    done: index < currentIndex,
    current: index === currentIndex,
  }));
}
