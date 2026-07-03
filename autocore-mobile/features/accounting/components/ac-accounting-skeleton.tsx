import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

import { ac } from '../layout';

function SectionLabelSkeleton() {
  return <Skeleton width={140} height={16} rounded="sm" />;
}

function RowSkeleton({ inset = 0 }: { inset?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: inset }}>
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
      <View style={{ paddingTop: insets.top + 6, paddingBottom: 8, alignItems: 'center', gap: 10 }}>
        <Skeleton width={ac.logo} height={ac.logo} rounded="lg" />
        <Skeleton width={128} height={22} rounded="md" />
        <Skeleton width={200} height={32} rounded="md" />
        <Skeleton width={160} height={12} rounded="sm" />
      </View>

      <View style={{ paddingHorizontal: ac.pad, gap: ac.section }}>
        <View
          style={{
            borderRadius: ac.heroRadius,
            borderWidth: ac.hairline,
            borderColor: colors.border,
            backgroundColor: toneBackground(colors.primary, 0.06),
            padding: 20,
            gap: 18,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: 8 }}>
              <Skeleton width={110} height={12} rounded="sm" />
              <Skeleton width={88} height={11} rounded="sm" />
            </View>
            <Skeleton width={88} height={32} rounded="md" />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={{ width: '46%', gap: 8 }}>
                <Skeleton width={64} height={11} rounded="sm" />
                <Skeleton width="80%" height={16} rounded="sm" />
                <Skeleton width="55%" height={10} rounded="sm" />
              </View>
            ))}
          </View>
        </View>

        <View>
          <SectionLabelSkeleton />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  minWidth: '47%',
                  borderRadius: ac.cardRadius,
                  borderWidth: ac.hairline,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  padding: 14,
                  gap: 10,
                }}
              >
                <Skeleton width={72} height={11} rounded="sm" />
                <Skeleton width="70%" height={18} rounded="sm" />
                <Skeleton width="90%" height={10} rounded="sm" />
                <Skeleton width="100%" height={20} rounded="sm" />
              </View>
            ))}
          </View>
        </View>

        <View>
          <SectionLabelSkeleton />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: ac.pad, marginTop: 12 }}
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <View
                key={index}
                style={{
                  width: ac.actionTileWide,
                  minHeight: ac.actionTile,
                  borderRadius: ac.cardRadius,
                  borderWidth: ac.hairline,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  padding: 14,
                  gap: 12,
                  justifyContent: 'space-between',
                }}
              >
                <Skeleton width={36} height={36} rounded="lg" />
                <Skeleton width={72} height={13} rounded="sm" />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabelSkeleton />
          {Array.from({ length: 2 }).map((_, index) => (
            <View
              key={index}
              style={{
                borderRadius: ac.cardRadius,
                borderWidth: ac.hairline,
                borderColor: colors.border,
                backgroundColor: colors.card,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Skeleton width={32} height={32} rounded="md" />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="68%" height={14} rounded="sm" />
                <Skeleton width="84%" height={11} rounded="sm" />
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 12 }}>
          <SectionLabelSkeleton />
          {Array.from({ length: 4 }).map((_, index) => (
            <RowSkeleton key={index} />
          ))}
        </View>

        <View
          style={{
            borderRadius: ac.cardRadius,
            borderWidth: ac.hairline,
            borderColor: colors.border,
            backgroundColor: colors.card,
            padding: 16,
            gap: 14,
          }}
        >
          <Skeleton width={120} height={16} rounded="sm" />
          <Skeleton width="100%" height={36} rounded="lg" />
          <Skeleton width="100%" height={120} rounded="lg" />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
            <Skeleton width={64} height={11} rounded="sm" />
            <Skeleton width={64} height={11} rounded="sm" />
            <Skeleton width={64} height={11} rounded="sm" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
