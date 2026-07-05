import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { radius } from '@/theme/radius';

import { ac } from '../layout';

function ChipSkeleton() {
  return <Skeleton width={88} height={ac.filterHeight} rounded="full" />;
}

function TileSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: radius['3xl'],
        padding: rhythm.stack + 4,
        minHeight: 132,
        gap: rhythm.stack,
        justifyContent: 'space-between',
      }}
    >
      <Skeleton width={36} height={36} rounded="lg" />
      <View style={{ gap: 8 }}>
        <Skeleton width="70%" height={24} rounded="sm" />
        <Skeleton width="50%" height={12} rounded="sm" />
      </View>
    </View>
  );
}

function RowSkeleton() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <Skeleton width={40} height={40} rounded="lg" />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="72%" height={14} rounded="sm" />
        <Skeleton width="48%" height={11} rounded="sm" />
      </View>
      <Skeleton width={56} height={14} rounded="sm" />
    </View>
  );
}

export function AcAccountingSkeleton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom, 12) + 96,
      }}
    >
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: ac.pad, paddingBottom: 8, gap: 6 }}>
        <Skeleton width={120} height={28} rounded="md" />
        <Skeleton width={220} height={14} rounded="sm" />
      </View>

      <View style={{ paddingHorizontal: ac.pad, gap: ac.section }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <ChipSkeleton key={index} />
          ))}
        </ScrollView>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: radius['3xl'],
            padding: rhythm.stack + 4,
            gap: rhythm.stack,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width={100} height={12} rounded="sm" />
            <Skeleton width={64} height={24} rounded="full" />
          </View>
          <Skeleton width="75%" height={36} rounded="md" />
          <Skeleton width="55%" height={12} rounded="sm" />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 72, marginTop: 4 }}>
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} width={28} height={24 + index * 6} rounded="sm" style={{ flex: 1 }} />
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: rhythm.stack }}>
          <TileSkeleton />
          <TileSkeleton />
        </View>

        <View style={{ gap: 12 }}>
          <Skeleton width={140} height={16} rounded="sm" />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={{ alignItems: 'center', gap: 8 }}>
                <Skeleton width={56} height={56} rounded="full" />
                <Skeleton width={64} height={11} rounded="sm" />
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Skeleton width={160} height={16} rounded="sm" />
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius['3xl'],
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
