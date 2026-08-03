import { useEffect } from 'react';

import { markStartup, logStartupTable } from '@/lib/performance/startup-tracer';
import { OverviewScreen } from '@/features/overview';

export default function HomeRoute() {
  useEffect(() => {
    markStartup('tabs_interactive');
    logStartupTable();
  }, []);

  return <OverviewScreen />;
}
