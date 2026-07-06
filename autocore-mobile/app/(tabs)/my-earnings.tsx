import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { MyEarningsScreen } from '@/features/profile/screens/my-earnings-screen';

export default function MyEarningsTabRoute() {
  return (
    <AnimatedTabScreen tab="my-earnings">
      <MyEarningsScreen variant="tab" />
    </AnimatedTabScreen>
  );
}
