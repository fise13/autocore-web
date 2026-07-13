type PendingRelocateItem = {
  kind: 'relocate-item';
  itemId: string;
  itemTitle: string;
  warehouseId: string;
  shelf?: string;
  quantity?: number;
  startedAt: number;
};

type PendingAssignAsset = {
  kind: 'assign-asset';
  entityType: 'motor' | 'specific';
  entityId: string;
  title: string;
  startedAt: number;
};

type PendingFillLocation = {
  kind: 'fill-location';
  locationId: string;
  displayCode: string;
  warehouseId: string;
  startedAt: number;
};

export type LocationOpsPending = PendingRelocateItem | PendingAssignAsset | PendingFillLocation;

let pending: LocationOpsPending | null = null;
const listeners = new Set<(value: LocationOpsPending | null) => void>();

function emit() {
  for (const listener of listeners) listener(pending);
}

export const relocatePendingStore = {
  get(): LocationOpsPending | null {
    return pending;
  },
  set(next: LocationOpsPending | null) {
    pending = next;
    emit();
  },
  /** Back-compat helper for inventory move sheet. */
  setRelocateItem(next: Omit<PendingRelocateItem, 'kind' | 'startedAt'> & { startedAt?: number }) {
    pending = {
      kind: 'relocate-item',
      startedAt: next.startedAt ?? Date.now(),
      ...next,
    };
    emit();
  },
  setAssignAsset(next: Omit<PendingAssignAsset, 'kind' | 'startedAt'> & { startedAt?: number }) {
    pending = {
      kind: 'assign-asset',
      startedAt: next.startedAt ?? Date.now(),
      ...next,
    };
    emit();
  },
  setFillLocation(next: Omit<PendingFillLocation, 'kind' | 'startedAt'> & { startedAt?: number }) {
    pending = {
      kind: 'fill-location',
      startedAt: next.startedAt ?? Date.now(),
      ...next,
    };
    emit();
  },
  clear() {
    pending = null;
    emit();
  },
  subscribe(listener: (value: LocationOpsPending | null) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
