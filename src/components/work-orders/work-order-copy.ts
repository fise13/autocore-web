import { WorkOrderAssigneeRole, WorkOrderStatus } from "@/domain/work-order";
import { userCopy } from "@/lib/user-copy";

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  get draft() {
    return userCopy.workOrders.status.draft;
  },
  get confirmed() {
    return userCopy.workOrders.status.confirmed;
  },
  get in_progress() {
    return userCopy.workOrders.status.in_progress;
  },
  get waiting_parts() {
    return userCopy.workOrders.status.waiting_parts;
  },
  get completed() {
    return userCopy.workOrders.status.completed;
  },
  get delivered() {
    return userCopy.workOrders.status.delivered;
  },
  get cancelled() {
    return userCopy.workOrders.status.cancelled;
  },
};

export const STATUS_HINTS: Record<WorkOrderStatus, string> = {
  get draft() {
    return userCopy.workOrders.statusHint.draft;
  },
  get confirmed() {
    return userCopy.workOrders.statusHint.confirmed;
  },
  get in_progress() {
    return userCopy.workOrders.statusHint.in_progress;
  },
  get waiting_parts() {
    return userCopy.workOrders.statusHint.waiting_parts;
  },
  get completed() {
    return userCopy.workOrders.statusHint.completed;
  },
  get delivered() {
    return userCopy.workOrders.statusHint.delivered;
  },
  get cancelled() {
    return userCopy.workOrders.statusHint.cancelled;
  },
};

export const ROLE_LABELS: Record<WorkOrderAssigneeRole, string> = {
  get mechanic() {
    return userCopy.workOrders.roles.mechanic;
  },
  get diagnostician() {
    return userCopy.workOrders.roles.diagnostician;
  },
  get manager() {
    return userCopy.workOrders.roles.manager;
  },
};

export const TRANSITION_LABELS: Partial<Record<WorkOrderStatus, string>> = {
  get confirmed() {
    return userCopy.workOrders.transitions.confirmed;
  },
  get in_progress() {
    return userCopy.workOrders.transitions.in_progress;
  },
  get waiting_parts() {
    return userCopy.workOrders.transitions.waiting_parts;
  },
  get completed() {
    return userCopy.workOrders.transitions.completed;
  },
  get delivered() {
    return userCopy.workOrders.transitions.delivered;
  },
  get cancelled() {
    return userCopy.workOrders.transitions.cancelled;
  },
};

export function transitionLabel(from: WorkOrderStatus, to: WorkOrderStatus): string {
  if (to === "in_progress" && from === "waiting_parts") {
    return userCopy.workOrders.transitions.continueWork;
  }
  if (to === "in_progress" && from === "confirmed") {
    return userCopy.workOrders.transitions.in_progress;
  }
  return TRANSITION_LABELS[to] ?? STATUS_LABELS[to];
}

export function eventTypeLabel(type: string): string {
  const events = userCopy.workOrders.events as Record<string, string>;
  return events[type] ?? type;
}
