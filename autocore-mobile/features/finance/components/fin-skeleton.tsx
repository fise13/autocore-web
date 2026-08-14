import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin } from '../layout';

/**
 * The skeleton is the real layout with the numbers removed — same rhythm, same
 * block sizes — so the screen settles into place instead of reflowing when the
 * first snapshot lands.
 */
export function FinSkeleton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
    >
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: fin.pad,
          paddingBottom: fin.stack,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: fin.stack,
        }}
      >
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={132} height={32} rounded="md" />
          <Skeleton width={188} height={13} rounded="sm" />
        </View>
        <Skeleton width={44} height={44} rounded="full" />
        <Skeleton width={78} height={44} rounded="full" />
      </View>

      <View style={{ paddingHorizontal: fin.pad, gap: fin.chapter }}>
        {/* Health */}
        <View style={{ gap: fin.stack }}>
          <Skeleton width={110} height={13} rounded="sm" />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: fin.stack }}>
            <Skeleton width={104} height={56} rounded="md" />
            <View style={{ flex: 1, gap: 7, paddingBottom: 8 }}>
              <Skeleton width="52%" height={16} rounded="sm" />
              <Skeleton width="72%" height={12} rounded="sm" />
            </View>
          </View>
          <Skeleton width="100%" height={6} rounded="full" />
        </View>

        {/* Primary metric + curve */}
        <View style={{ gap: fin.stack }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width={80} height={13} rounded="sm" />
            <Skeleton width={168} height={34} rounded="full" />
          </View>
          <Skeleton width="62%" height={48} rounded="md" />
          <Skeleton width="42%" height={14} rounded="sm" />
          <View
            style={{
              height: fin.chartHeight,
              borderRadius: fin.sheetRadius,
              backgroundColor: colors.muted,
              opacity: 0.6,
            }}
          />
        </View>

        {/* Trends */}
        <View style={{ gap: fin.stack }}>
          <Skeleton width={96} height={22} rounded="sm" />
          <View
            style={{
              borderRadius: fin.sheetRadius,
              borderWidth: fin.hairline,
              borderColor: colors.borderMuted,
              backgroundColor: colors.card,
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: fin.stack,
                  paddingHorizontal: fin.stack,
                  height: 64,
                  borderTopWidth: index === 0 ? 0 : fin.hairline,
                  borderTopColor: colors.borderMuted,
                }}
              >
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="38%" height={12} rounded="sm" />
                  <Skeleton width="56%" height={20} rounded="sm" />
                </View>
                <Skeleton width={56} height={20} rounded="sm" />
              </View>
            ))}
          </View>
        </View>

        {/* What changed */}
        <View style={{ gap: fin.stack }}>
          <Skeleton width={140} height={22} rounded="sm" />
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={index} style={{ gap: 7, paddingVertical: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Skeleton width={112} height={15} rounded="sm" />
                <Skeleton width={70} height={15} rounded="sm" />
              </View>
              <Skeleton width={`${88 - index * 22}%`} height={4} rounded="full" />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
