import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ScanSearchIcon } from '@/assets/icons';
import { PageHeader } from '@/components/ui';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { useSearchEnter } from '@/features/search/animation';

import { whTimeline } from '../animation/timeline';
import { wh } from '../layout';

type WarehouseHeaderProps = {
  itemCount: number;
  lowStockCount: number;
};

export function WarehouseHeader({ itemCount, lowStockCount }: WarehouseHeaderProps) {
  const { colors } = useTheme();
  const navigateTab = useNavigateTab();
  const enterStyle = useSearchEnter({ delay: whTimeline.header, translateY: 8, duration: 320 });

  const subtitle =
    lowStockCount > 0
      ? `${itemCount} items · ${lowStockCount} low stock`
      : `${itemCount} items in stock`;

  return (
    <Animated.View style={enterStyle}>
      <PageHeader
        title="Warehouse"
        subtitle={subtitle}
        logo={null}
        align="start"
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan"
            onPress={() => {
              haptics.light();
              navigateTab('/(tabs)/scan');
            }}
            style={{
              width: rhythm.iconBox + rhythm.micro,
              height: rhythm.iconBox + rhythm.micro,
              borderRadius: wh.radius,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(colors.primary, 0.1),
            }}
          >
            <ScanSearchIcon size="sm" color={colors.primary} strokeWidth={2} />
          </Pressable>
        }
      />
    </Animated.View>
  );
}
