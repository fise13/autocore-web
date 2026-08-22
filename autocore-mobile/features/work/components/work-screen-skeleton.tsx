import { View } from 'react-native';

import { PageHeader } from '@/components/ui/page-header';
import { ProductScreenShell, ScreenScroll, Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { tokens } from '@/theme/tokens';

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
            marginTop: workLayout.headingTop + workLayout.todayTop,
            marginHorizontal: workLayout.pad,
            minHeight: workLayout.todayMinHeight,
            paddingHorizontal: workLayout.todayPad,
            paddingVertical: workLayout.todayPad,
            borderRadius: tokens.radius.modal,
            backgroundColor: colors.card,
            gap: 12,
          }}
        >
          <Skeleton width="42%" height={15} />
          <Skeleton width="92%" height={20} />
          <Skeleton width="78%" height={20} />
          <View style={{ height: tokens.control.hairline, backgroundColor: colors.border }} />
          <Skeleton width="100%" height={120} rounded="group" />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="36%" height={12} />
            <Skeleton width="32%" height={12} />
          </View>
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
