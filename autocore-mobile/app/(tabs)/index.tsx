import { useEffect } from 'react';

import { markStartup, logStartupTable } from '@/lib/performance/startup-tracer';
import { MissionControlScreen } from '@/features/mission-control';

export default function HomeRoute() {
  useEffect(() => {
    markStartup('tabs_interactive');
    logStartupTable();
  }, []);

  return <MissionControlScreen />;
}
