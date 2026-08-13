import { View } from 'react-native';

import { PageHeader } from '@/components/ui/page-header';
import { ProductScreenShell, ScreenScroll, Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

import { workLayout } from '../layout';

/**
 * Structural placeholder for Work — Today card + two workspace groups —
 * so the tab never flashes EmptyState / live rows before session + counts land.
 */
export function WorkScreenSkeleton() {
  const { colors } = useTheme();

  return (
    <ProductScreenShell animateEnter={false}>
      <ScreenScroll tabBarInset edgeTitle="Work">
        <PageHeader title="Work" />

        <Skeleton
          width={72}
          height={22}
          style={{
            marginTop: workLayout.headingTop,
            marginHorizontal: workLayout.pad,
          }}
        />
        <View
          style={{
            marginTop: workLayout.todayTop,
            marginHorizontal: workLayout.pad,
            minHeight: workLayout.todayMinHeight,
            paddingHorizontal: workLayout.todayPad,
            paddingVertical: workLayout.todayPad - 3,
            borderRadius: workLayout.cardRadius + 2,
            backgroundColor: colors.card,
            flexDirection: 'row',
            alignItems: 'center',
            gap: workLayout.pad,
          }}
        >
          <Skeleton width={34} height={28} rounded="control" />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="72%" height={13} />
          </View>
        </View>

        <Skeleton
          width={110}
          height={22}
          style={{
            marginTop: workLayout.todayBottom,
            marginBottom: workLayout.workspacesBottom,
            marginHorizontal: workLayout.pad,
          }}
        />

        {[0, 1].map((section) => (
          <View key={section} style={{ marginBottom: workLayout.sectionGap }}>
            <Skeleton
              width={section === 0 ? 64 : 88}
              height={12}
              style={{
                marginBottom: workLayout.labelBottom,
                marginHorizontal: workLayout.pad,
              }}
            />
            <View
              style={{
                marginHorizontal: workLayout.pad,
                backgroundColor: colors.card,
                borderRadius: workLayout.cardRadius,
                overflow: 'hidden',
              }}
            >
              {[0, 1, 2].map((row) => (
                <View key={row}>
                  {row > 0 ? (
                    <View
                      style={{
                        height: workLayout.dividerHeight,
                        marginLeft: workLayout.dividerInset,
                        backgroundColor: colors.border,
                      }}
                    />
                  ) : null}
                  <View
                    style={{
                      minHeight: workLayout.rowMinHeight,
                      paddingHorizontal: workLayout.cardPadX,
                      paddingVertical: workLayout.rowPadY,
                      justifyContent: 'center',
                      gap: workLayout.rowGap + 4,
                    }}
                  >
                    <Skeleton width="42%" height={16} />
                    <Skeleton width="68%" height={13} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScreenScroll>
    </ProductScreenShell>
  );
}
