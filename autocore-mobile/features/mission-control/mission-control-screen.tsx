import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';

import { useMissionControlData } from '@/hooks';
import { McActivityFeed } from './components/mc-activity-feed';
import { McAttentionBanner } from './components/mc-attention-banner';
import { McHeader } from './components/mc-header';
import { McOverview } from './components/mc-overview';
import { McQuickActions } from './components/mc-quick-actions';
import { mc } from './layout';

export function MissionControlScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useMissionControlData();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 10) + 80,
        }}
      >
        <McHeader />

        <View style={{ paddingHorizontal: mc.pad, gap: mc.section }}>
          {data.attention.items.length > 0 ? <McAttentionBanner attention={data.attention} /> : null}
          <McOverview metrics={data.overview} />
          <McQuickActions actions={data.quickActions} />
          <McActivityFeed items={data.activity} />
        </View>
      </ScrollView>
    </View>
  );
}
