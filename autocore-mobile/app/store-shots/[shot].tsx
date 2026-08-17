import { useLocalSearchParams } from 'expo-router';

import { LoginScreen } from '@/authentication/login-screen';
import { EnginesScreen } from '@/features/engines/engines-screen';
import { FinanceScreen } from '@/features/finance';
import { ScanScreen } from '@/features/scan';
import { PaywallScreen } from '@/features/subscription/paywall-screen';
import { WorkScreen } from '@/features/work/work-screen';

/**
 * Real product surfaces for App Store captures (`EXPO_PUBLIC_STORE_SHOTS=1`).
 * Open `autocoremobile://store-shots/work` (etc).
 */
export default function StoreShotsRoute() {
  const { shot } = useLocalSearchParams<{ shot?: string | string[] }>();
  const id = Array.isArray(shot) ? shot[0] : shot;

  switch (id) {
    case 'work':
      return <WorkScreen />;
    case 'engines':
      return <EnginesScreen />;
    case 'scan':
      return <ScanScreen />;
    case 'finance':
      return <FinanceScreen />;
    case 'paywall':
      return <PaywallScreen variant="modal" />;
    default:
      return <LoginScreen />;
  }
}
