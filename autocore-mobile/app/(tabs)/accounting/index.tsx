import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { FinanceScreen } from '@/features/finance';

export default function FinanceRoute() {
  return (
    <AnimatedTabScreen tab="accounting">
      <FinanceScreen />
    </AnimatedTabScreen>
  );
}
