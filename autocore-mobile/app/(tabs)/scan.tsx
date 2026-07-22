import { StaticTabScreen } from '@/components/navigation/animated-tab-screen';
import { ScanScreen } from '@/features/scan';

export default function ScanRoute() {
  return (
    <StaticTabScreen>
      <ScanScreen />
    </StaticTabScreen>
  );
}
