import { create } from 'zustand';

import type { OrderStatus, WorkOrder } from '../types';

type OrdersState = {
  orders: WorkOrder[];
  setOrders: (orders: WorkOrder[]) => void;
  getOrder: (id: string) => WorkOrder | undefined;
};

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  getOrder: (id) => get().orders.find((order) => order.id === id),
}));

export function applyStatusPatch(status: OrderStatus): Pick<WorkOrder, 'status' | 'progress'> {
  switch (status) {
    case 'draft':
      return { status, progress: 10 };
    case 'confirmed':
      return { status, progress: 25 };
    case 'waiting_parts':
      return { status, progress: 45 };
    case 'in_progress':
      return { status, progress: 60 };
    case 'completed':
      return { status, progress: 92 };
    case 'delivered':
      return { status, progress: 100 };
    case 'cancelled':
      return { status, progress: 0 };
    default:
      return { status, progress: 35 };
  }
}
