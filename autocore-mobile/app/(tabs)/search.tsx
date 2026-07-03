import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { SearchScreen } from '@/features/search';

export default function SearchRoute() {
  return (
    <AnimatedTabScreen tab="search">
      <SearchScreen />
    </AnimatedTabScreen>
  );
}
