import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { ProfileScreen } from '@/features/profile';

export default function ProfileIndexRoute() {
  return (
    <AnimatedTabScreen tab="profile">
      <ProfileScreen />
    </AnimatedTabScreen>
  );
}
