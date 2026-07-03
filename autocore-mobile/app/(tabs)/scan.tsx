import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { ScanScreen } from '@/features/scan';

export default function ScanRoute() {
  return (
    <AnimatedTabScreen tab="scan">
      <ScanScreen />
    </AnimatedTabScreen>
  );
}
