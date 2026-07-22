import { StaticTabScreen } from '@/components/navigation/animated-tab-screen';
import { ProfileScreen } from '@/features/profile';

export default function ProfileIndexRoute() {
  return (
    <StaticTabScreen>
      <ProfileScreen />
    </StaticTabScreen>
  );
}
