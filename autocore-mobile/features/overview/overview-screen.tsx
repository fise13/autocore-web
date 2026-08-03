import { memo, useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { ProductScreenShell, ScreenGate, ScreenScroll } from '@/components/ui';
import { useOverviewData, useRealtimeReconnect } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';

import { McActivityFeed } from './components/mc-activity-feed';
import { McFeaturedInsight } from './components/mc-featured-insight';
import { McHeader } from './components/mc-header';
import { McRevenueCard } from './components/mc-revenue-card';
import { McStatTiles } from './components/mc-stat-tiles';
import { mc } from './layout';

function OverviewBody() {
  const data = useOverviewData();

  return (
    <>
      <McHeader />
      <View style={{ paddingHorizontal: mc.pad, gap: mc.section, paddingBottom: mc.section }}>
        <McRevenueCard revenue={data.revenue} />
        <McStatTiles tiles={data.statTiles} />
        <McFeaturedInsight insight={data.featuredInsight} />
        <McActivityFeed items={data.activity} />
      </View>
    </>
  );
}

const MemoBody = memo(OverviewBody);

export function OverviewScreen() {
  const rbac = useRbacPolicy();
  const reconnectRealtime = useRealtimeReconnect();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reconnectRealtime();
    setRefreshing(false);
  }, [reconnectRealtime]);

  if (!rbac.nav.canAccessOverview) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Home"
        description="Your role cannot open this screen."
      />
    );
  }

  return (
    <ProductScreenShell brandWash animateEnter={false}>
      <ScreenScroll
        tabBarInset
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <MemoBody />
      </ScreenScroll>
    </ProductScreenShell>
  );
}
