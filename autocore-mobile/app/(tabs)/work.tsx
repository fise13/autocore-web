import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { WorkScreen } from '@/features/work/work-screen';

export default function WorkRoute() {
  return (
    <AnimatedTabScreen tab="work">
      <WorkScreen />
    </AnimatedTabScreen>
  );
}
