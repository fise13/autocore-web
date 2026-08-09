import { useEffect } from 'react';

import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { OverviewScreen } from '@/features/overview';
import { markStartup, logStartupTable } from '@/lib/performance/startup-tracer';

export default function HomeRoute() {
  useEffect(() => {
    markStartup('tabs_interactive');
    logStartupTable();
  }, []);

  return (
    <AnimatedTabScreen tab="index">
      <OverviewScreen />
    </AnimatedTabScreen>
  );
}
