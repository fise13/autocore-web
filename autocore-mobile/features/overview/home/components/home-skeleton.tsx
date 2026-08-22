import { memo } from 'react';
import { View } from 'react-native';

import { Skeleton } from '@/components/ui';

import { home, HomeDivider, HomeSection, HomeSurface } from './home-primitives';

/**
 * Structure-preserving loading state.
 *
 * It has the shape of the brief and — the point — nothing numeric in it. A count
 * is never guessed at zero while its listener is still in flight, so the reader
 * cannot mistake a loading screen for a quiet warehouse.
 */
const CompactRowSkeleton = memo(function CompactRowSkeleton() {
  return (
    <View
      style={{
        paddingHorizontal: home.rowPadX,
        paddingVertical: home.rowPadY,
        gap: home.inline,
        minHeight: 62,
        justifyContent: 'center',
      }}
    >
      <Skeleton width="38%" height={13} />
      <Skeleton width="26%" height={18} />
    </View>
  );
});

export const HomeSkeleton = memo(function HomeSkeleton() {
  return (
    <View style={{ gap: home.section }}>
      <HomeSection title="Summary">
        <HomeSurface>
          <View
            style={{
              paddingHorizontal: home.rowPadX,
              paddingVertical: home.block,
              gap: home.stack,
            }}
          >
            <Skeleton width="52%" height={14} />
            <Skeleton width="40%" height={32} />
            <Skeleton width="72%" height={12} />
          </View>
          <HomeDivider />
          <CompactRowSkeleton />
          <HomeDivider />
          <CompactRowSkeleton />
        </HomeSurface>
      </HomeSection>

      <HomeSection title="Recent activity">
        <HomeSurface>
          <CompactRowSkeleton />
          <HomeDivider />
          <CompactRowSkeleton />
        </HomeSurface>
      </HomeSection>
    </View>
  );
});
