import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { OrdersScreen } from '@/features/orders';

export default function OrdersIndexRoute() {
  return (
    <AnimatedTabScreen tab="orders">
      <OrdersScreen />
    </AnimatedTabScreen>
  );
}
