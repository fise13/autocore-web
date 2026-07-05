import { useScreenEnter } from '@/animations';

type OrdersEnterConfig = {
  delay?: number;
  translateY?: number;
  duration?: number;
  enabled?: boolean;
};

export function useOrdersEnter(config: OrdersEnterConfig = {}) {
  return useScreenEnter(config);
}
