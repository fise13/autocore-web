import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { WarehouseScreen } from '@/features/warehouse';

export default function WarehouseRoute() {
  return (
    <AnimatedTabScreen tab="warehouse">
      <WarehouseScreen />
    </AnimatedTabScreen>
  );
}
