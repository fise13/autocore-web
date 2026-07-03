import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { MissionControlScreen } from '@/features/mission-control';

export default function HomeRoute() {
  return (
    <AnimatedTabScreen tab="index">
      <MissionControlScreen />
    </AnimatedTabScreen>
  );
}
