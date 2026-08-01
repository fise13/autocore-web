import { memo, useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { ProductScreenShell, ScreenGate, ScreenScroll } from '@/components/ui';
import { useMissionControlData, useRealtimeReconnect } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';

import { McActivityFeed } from './components/mc-activity-feed';
import { McFeaturedInsight } from './components/mc-featured-insight';
import { McHeader } from './components/mc-header';
import { McQuickActions } from './components/mc-quick-actions';
import { McRevenueCard } from './components/mc-revenue-card';
import { McStatTiles } from './components/mc-stat-tiles';
import { mc } from './layout';

function MissionControlBody() {
  const data = useMissionControlData();

  return (
    <>
      <McHeader />
      <View style={{ paddingHorizontal: mc.pad, gap: mc.section, paddingBottom: mc.section }}>
        <McRevenueCard revenue={data.revenue} />
        <McStatTiles tiles={data.statTiles} />
        <McQuickActions actions={data.quickActions} />
        <McFeaturedInsight insight={data.featuredInsight} />
        <McActivityFeed items={data.activity} />
      </View>
    </>
  );
}

const MemoBody = memo(MissionControlBody);

export function MissionControlScreen() {
  const rbac = useRbacPolicy();
  const reconnectRealtime = useRealtimeReconnect();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reconnectRealtime();
    setRefreshing(false);
  }, [reconnectRealtime]);

  if (!rbac.nav.canAccessMissionControl) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Mission Control"
        description="Your role doesn't have access to the dashboard."
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
