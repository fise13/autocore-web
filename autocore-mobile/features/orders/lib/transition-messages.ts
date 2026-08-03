import { nextStatuses, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import type { WorkOrderStatus } from '@/types/work-order';

/** Statuses that can legally move to completed in one step. */
export function canMarkCompleted(status: WorkOrderStatus): boolean {
  return nextStatuses(status).includes('completed');
}

/**
 * Human-readable reason when jumping to completed is not allowed.
 * Guides the user to the next valid step instead of dumping raw status keys.
 */
export function explainCannotComplete(status: WorkOrderStatus): {
  title: string;
  description: string;
} {
  const next = nextStatuses(status).find((statusId) => statusId !== 'cancelled');
  const currentLabel = STATUS_LABELS[status];

  if (status === 'draft') {
    return {
      title: 'Confirm the order first',
      description: 'Draft orders must be confirmed before work can be completed.',
    };
  }
  if (status === 'confirmed') {
    return {
      title: 'Start work first',
      description: 'Confirmed orders need to be in progress before they can be completed.',
    };
  }
  if (status === 'delivered' || status === 'cancelled' || status === 'completed') {
    return {
      title: 'Already closed',
      description: `This work order is ${currentLabel.toLowerCase()}.`,
    };
  }
  if (next) {
    return {
      title: 'Not ready to complete',
      description: `Move it to ${STATUS_LABELS[next]} first, then complete.`,
    };
  }
  return {
    title: 'Cannot complete',
    description: `Status “${currentLabel}” cannot jump to Completed.`,
  };
}

/** Friendlier copy for API / domain transition errors. */
export function humanizeTransitionError(
  message: string,
  current?: WorkOrderStatus,
  next?: WorkOrderStatus,
): { title: string; description: string } {
  const isInvalid =
    /недопустим/i.test(message) ||
    /invalid transition/i.test(message) ||
    /cannot transition/i.test(message);

  if (isInvalid && next === 'completed' && current) {
    return explainCannotComplete(current);
  }

  if (isInvalid && current && next) {
    return {
      title: 'Status change not allowed',
      description: `Cannot move from ${STATUS_LABELS[current]} to ${STATUS_LABELS[next]}.`,
    };
  }

  if (isInvalid) {
    return {
      title: 'Status change not allowed',
      description: 'This work order cannot move to that status yet.',
    };
  }

  return {
    title: 'Failed to update status',
    description: message,
  };
}
