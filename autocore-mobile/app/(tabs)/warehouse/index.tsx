import { StaticTabScreen } from '@/components/navigation/animated-tab-screen';
import { WarehouseScreen } from '@/features/warehouse';

export default function WarehouseRoute() {
  return (
    <StaticTabScreen>
      <WarehouseScreen />
    </StaticTabScreen>
  );
}
