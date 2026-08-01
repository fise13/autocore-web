import type { OrderStatus } from '../types';
import { WO_DOMAIN_STAGES } from '../theme/wo-visual';

export type WorkflowStageId = OrderStatus;

export type WorkflowStage = {
  id: WorkflowStageId;
  label: string;
  done: boolean;
  current: boolean;
};

const STAGE_LABELS: Record<WorkflowStageId, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_progress: 'Progress',
  waiting_parts: 'Parts',
  completed: 'Done',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function resolveStageIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1;
  const index = WO_DOMAIN_STAGES.indexOf(status);
  return index >= 0 ? index : 0;
}

/** Domain path: draft → confirmed → in_progress → waiting_parts → completed → delivered */
export function getWorkflowStages(status: OrderStatus): WorkflowStage[] {
  if (status === 'cancelled') {
    return WO_DOMAIN_STAGES.map((id) => ({
      id,
      label: STAGE_LABELS[id],
      done: false,
      current: false,
    }));
  }

  const currentIndex = resolveStageIndex(status);
  const terminal = status === 'delivered' || status === 'completed';

  return WO_DOMAIN_STAGES.map((id, index) => ({
    id,
    label: STAGE_LABELS[id],
    done: terminal ? index <= currentIndex : index < currentIndex,
    current: !terminal && index === currentIndex,
  }));
}
