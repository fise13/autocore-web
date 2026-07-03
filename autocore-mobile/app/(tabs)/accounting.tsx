import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { AccountingScreen } from '@/features/accounting';

export default function AccountingRoute() {
  return (
    <AnimatedTabScreen tab="accounting">
      <AccountingScreen />
    </AnimatedTabScreen>
  );
}
