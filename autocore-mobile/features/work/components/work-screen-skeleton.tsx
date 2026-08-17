import { View } from 'react-native';

import { PageHeader } from '@/components/ui/page-header';
import { ProductScreenShell, ScreenScroll, Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

import { workLayout } from '../layout';

/**
 * First-fold only — session chrome is already on screen; this is just the
 * brief gap before the catalog can paint.
 */
export function WorkScreenSkeleton() {
  const { colors } = useTheme();

  return (
    <ProductScreenShell animateEnter={false}>
      <ScreenScroll tabBarInset edgeTitle="Work">
        <PageHeader title="Work" />

        <View
          style={{
            marginTop: workLayout.headingTop,
            marginHorizontal: workLayout.pad,
            minHeight: workLayout.todayMinHeight,
            paddingHorizontal: workLayout.todayPad,
            paddingVertical: workLayout.todayPad - 3,
            borderRadius: workLayout.cardRadius + 2,
            backgroundColor: colors.card,
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Skeleton width="48%" height={16} />
          <Skeleton width="70%" height={13} />
        </View>

        <View
          style={{
            marginTop: workLayout.todayBottom,
            marginHorizontal: workLayout.pad,
            backgroundColor: colors.card,
            borderRadius: workLayout.cardRadius,
            overflow: 'hidden',
          }}
        >
          {[0, 1].map((row) => (
            <View
              key={row}
              style={{
                minHeight: workLayout.rowMinHeight,
                paddingHorizontal: workLayout.cardPadX,
                paddingVertical: workLayout.rowPadY,
                justifyContent: 'center',
                gap: workLayout.rowGap + 4,
                borderTopWidth: row === 0 ? 0 : workLayout.dividerHeight,
                borderTopColor: colors.border,
              }}
            >
              <Skeleton width="40%" height={16} />
              <Skeleton width="62%" height={13} />
            </View>
          ))}
        </View>
      </ScreenScroll>
    </ProductScreenShell>
  );
}
