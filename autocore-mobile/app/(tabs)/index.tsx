import { useEffect } from 'react';
import { View } from 'react-native';

import { markStartup, logStartupTable } from '@/lib/performance/startup-tracer';
import { MissionControlScreen } from '@/features/mission-control';
import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';

export default function HomeRoute() {
  useEffect(() => {
    markStartup('tabs_interactive');
    logStartupTable();
  }, []);

  return (
    <AnimatedTabScreen tab="index">
      <MissionControlScreen />
    </AnimatedTabScreen>
  );
}
